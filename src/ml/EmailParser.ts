import { Transaction, TransactionType } from '../models/Transaction';
import { generateId } from '../utils/generateId';
import { classifyCategory, requiresUserConfirmation } from './CategoryClassifier';
import { isEmiSms } from './EMIDetector';
import { TransactionRepository } from '../storage/repositories/TransactionRepository';

// ── Regex helpers (shared with BankPatterns) ─────────────────────────────────

const balRe  = /(?:avl\.?\s*bal(?:ance)?|bal(?:ance)?(?:\s+is)?|available\s+(?:balance|credit\s+limit))\s*(?:(?:on\s+your\s+card\s+is|is)\s*)?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const refRe  = /(?:ref(?:erence)?(?:\s+no\.?)?|txn\s*id|utr|rrn)[:\s#]*([\w\d]+)/i;
const upiRe  = /([a-z0-9.\-_+]+@[a-z]+)/i;
const acctRe = /(?:a\/c|acc(?:ount)?|card)\s*(?:no\.?|number)?[\s*xX]*(\d{4})/i;
// dateRe not used directly — see parseTransactionDate below

// Foreign currency symbols/codes that are NOT INR
const FOREIGN_CCY_RE = /\b(?:USD|EUR|GBP|AED|SGD|CAD|AUD|JPY|CHF|HKD)\b/;

// Matches amounts like: 532.00  1,553.00  .00  50000  (handles missing leading digit)
const AMT_NUM = '([\\d,]*\\.?\\d+|\\d[\\d,]*)';

function toRawPaise(str: string): number {
  return Math.round(parseFloat(str.replace(/,/g, '')) * 100);
}

function parseAmount(text: string): number | null {
  // Priority 1: explicit "transaction of INR/Rs/₹ AMOUNT"
  const txnM = text.match(new RegExp(`transaction\\s+of\\s+(?:inr|rs\\.?|₹)\\s*${AMT_NUM}`, 'i'));
  if (txnM) return toRawPaise(txnM[1]);

  // Priority 2: transaction is in foreign currency — skip (can't store USD as paise)
  if (/transaction\s+of\s+/i.test(text) && FOREIGN_CCY_RE.test(text)) return null;

  // Priority 3: "credited/debited/spent/paid/deducted/amount [with/of/by] INR X"
  const p3M = text.match(new RegExp(`(?:credited|debited?|spent|paid|deducted|amount)\\s+(?:with\\s+|of\\s+|by\\s+)?(?:inr|rs\\.?|₹)\\s*${AMT_NUM}`, 'i'));
  if (p3M) return toRawPaise(p3M[1]);

  // Priority 4: "INR/Rs/₹ X [has been] credited/debited/spent/deducted"
  const p4M = text.match(new RegExp(`(?:inr|rs\\.?|₹)\\s*${AMT_NUM}\\s+(?:has been\\s+)?(?:credited|debited|spent|deducted)`, 'i'));
  if (p4M) return toRawPaise(p4M[1]);

  // Priority 5: "debited/credited/spent by/of/with INR X" — verb before currency
  const p5M = text.match(new RegExp(`(?:debited|credited|spent|withdrawn)\\s+(?:by\\s+|of\\s+|with\\s+)?(?:inr|rs\\.?|₹)\\s*${AMT_NUM}`, 'i'));
  if (p5M) return toRawPaise(p5M[1]);

  // Priority 6: any INR/Rs/₹ amount — strip balance/limit section first
  const withoutBal = text.replace(
    /(?:avl\.?\s*bal(?:ance)?|available\s+(?:credit\s+)?(?:balance|limit))[^\n]{0,300}/gi,
    ''
  );
  const genM = withoutBal.match(new RegExp(`(?:rs\\.?|inr|₹)\\s*${AMT_NUM}`, 'i'));
  if (!genM) return null;
  const val = toRawPaise(genM[1]);
  return val > 0 ? val : null;
}

function parseBalance(text: string): number | null {
  const m = text.match(balRe);
  if (!m) return null;
  return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
}

function detectType(text: string): TransactionType | null {
  const lower = text.toLowerCase();

  // Credit card usage = always debit (money OUT from customer's perspective)
  if (/has been used for\b/.test(lower)) return 'debit';
  if (/been used for a transaction/.test(lower)) return 'debit';
  if (/credit card.*\bused\b/.test(lower)) return 'debit';

  // Strong unambiguous credit signals (money INTO your account)
  if (/credited to your\b/.test(lower)) return 'credit';
  if (/credit(?:ed)? in your\b/.test(lower)) return 'credit';
  if (/received in your\b/.test(lower)) return 'credit';
  if (/\brefund\b/.test(lower) || /\bcashback\b/.test(lower)) return 'credit';

  // "credited to [merchant/UPI]" = payment OUT (debit for customer)
  if (/credited to (?!your)/.test(lower)) return 'debit';

  // Strong debit signals
  if (/debited from\b/.test(lower)) return 'debit';
  if (/debited with\b/.test(lower)) return 'debit';
  if (/\bdeducted\b/.test(lower)) return 'debit';

  const debitKeywords  = ['debited', 'debit', 'spent', 'paid to', 'withdrawn', 'payment of', 'sent to', 'purchase', 'has been used'];
  const creditKeywords = ['credited', 'received', 'deposited', 'salary', 'added'];

  const isDebit  = debitKeywords.some(k => lower.includes(k));
  const isCredit = creditKeywords.some(k => lower.includes(k));

  if (isDebit && !isCredit) return 'debit';
  if (isCredit && !isDebit) return 'credit';
  // When both signals are present, UPI/bank payment context defaults to debit
  if (isDebit && isCredit) return 'debit';
  return null;
}

function parseMerchant(text: string): string | null {
  // ICICI credit card: "Info: Amazon Seller Services." or "Info: UPI-XXXXX-Name"
  const infoM = text.match(/\bInfo:\s*([^\n.]{2,60}?)(?:\s*\.|$|\n)/i);
  if (infoM) {
    const raw = infoM[1].trim();
    // UPI reference: "UPI-606399758924-R S TRAD" → extract the payee name part
    const upiPayee = raw.match(/^UPI-\d+-(.{2,})$/i);
    if (upiPayee) return upiPayee[1].trim();
    if (raw.length > 1) return raw;
  }

  // Standard patterns: "at Merchant on", "to Person on"
  const atM = text.match(/\bat\s+([A-Za-z0-9 &.\-'*]{3,40}?)(?:\s+on|\s+via|\s+ref|\s*\.|\s*,|$)/i);
  if (atM) return atM[1].trim();
  const toM = text.match(/\bto\s+([A-Za-z][A-Za-z ]{2,30}?)(?:\s+on|\s+via|\s+ref|\s*\.|\s*,|$)/i);
  if (toM) return toM[1].trim();
  return null;
}

const MONTH_IDX: Record<string, number> = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
};

function parseTransactionDate(subject: string, body: string, emailDate?: number): number | null {
  // Search body first — transaction dates live in the body.
  // Subject is appended as fallback (covers cases where the date only appears there).
  const text = `${body} ${subject}`;

  // 7-day tolerance: reject any parsed date that is more than 7 days
  // before the email's own header date (billing-cycle dates, etc.).
  const maxAgeDelta = 7 * 24 * 60 * 60 * 1000;

  const tryDate = (ms: number): number | null => {
    if (isNaN(ms) || ms < 0) return null;
    const d = new Date(ms);
    if (d.getFullYear() < 2000) return null;
    if (emailDate && emailDate - ms > maxAgeDelta) return null; // date is too far before email
    return ms;
  };

  // DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY (Indian bank format)
  const dmyRe = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
  let dmy;
  while ((dmy = dmyRe.exec(text)) !== null) {
    let [, day, month, year] = dmy;
    if (year.length === 2) year = '20' + year;
    const result = tryDate(new Date(Number(year), Number(month) - 1, Number(day)).getTime());
    if (result) return result;
  }

  // "15 Jan 2025" or "15 January 2025" — use Date constructor, not Date.parse()
  const natRe = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b/gi;
  let nat;
  while ((nat = natRe.exec(text)) !== null) {
    const monthIdx = MONTH_IDX[nat[2].toLowerCase().slice(0, 3)];
    if (monthIdx === undefined) continue;
    const result = tryDate(new Date(Number(nat[3]), monthIdx, Number(nat[1])).getTime());
    if (result) return result;
  }

  return null;
}

// ── Bank sender → bank name mapping ─────────────────────────────────────────

const BANK_SENDER_MAP: { pattern: RegExp; bankName: string }[] = [
  { pattern: /hdfcbank/i,        bankName: 'HDFC' },
  { pattern: /onlinesbi|sbi/i,   bankName: 'SBI' },
  { pattern: /icicibank/i,       bankName: 'ICICI' },
  { pattern: /axisbank/i,        bankName: 'Axis' },
  { pattern: /kotak/i,           bankName: 'Kotak' },
  { pattern: /idfcfirstbank/i,   bankName: 'IDFC' },
  { pattern: /paytm/i,           bankName: 'Paytm' },
  { pattern: /phonepe/i,         bankName: 'PhonePe' },
  { pattern: /yesbank/i,         bankName: 'Yes Bank' },
  { pattern: /indusind/i,        bankName: 'IndusInd' },
  { pattern: /pnbindia|punjabnational/i, bankName: 'PNB' },
  { pattern: /canarabank/i,      bankName: 'Canara' },
];

export interface RawEmail {
  id: string;        // Gmail message ID
  from: string;      // sender address
  subject: string;
  body: string;      // plain-text body (stripped of HTML)
  date: number;      // epoch ms from email headers
}

function detectBankFromSender(from: string): string | null {
  for (const { pattern, bankName } of BANK_SENDER_MAP) {
    if (pattern.test(from)) return bankName;
  }
  return null;
}

/**
 * Quick pre-filter: does this email look like a transaction alert?
 * Rejects OTPs, promotional emails, bank statements, and login alerts
 * before expensive regex parsing runs.
 */
function isLikelyTransactionEmail(text: string): boolean {
  const lower = text.toLowerCase();
  // Must contain a currency indicator
  if (!/rs\.?[\s\d]|inr|₹/.test(lower)) return false;
  // Must contain a transaction keyword
  return /debit|credit|spent|paid\s+to|sent\s+to|received|transfer|withdraw|purchase|transact|deducted/.test(lower);
}

/**
 * Parse a single bank email into a Transaction.
 * Returns null if the email is not a financial transaction alert.
 */
async function parseEmail(
  email: RawEmail,
  userId: string,
  gmailAccount?: string,
): Promise<{ tx: Transaction; needsCategoryConfirm: boolean; emiDetected: boolean } | null> {
  const bankName = detectBankFromSender(email.from);
  if (!bankName) return null;

  // Combine subject + body for parsing (subject often has key fields)
  const fullText = `${email.subject} ${email.body}`;

  // Silently skip OTPs, login alerts, promotional emails, statements, etc.
  if (!isLikelyTransactionEmail(fullText)) return null;

  const amount = parseAmount(fullText);
  const type   = detectType(fullText);
  if (!amount || !type) {
    console.warn('[EmailParser] Could not parse amount/type. amount:', amount, 'type:', type, 'subject:', email.subject, 'bodySnippet:', email.body.slice(0, 200));
    return null;
  }

  const classification = await classifyCategory(fullText);
  const needsCategoryConfirm = requiresUserConfirmation(classification.confidence);
  const emiResult = isEmiSms(fullText);
  const now = Date.now();

  const acctMatch = fullText.match(acctRe);

  const tx: Transaction = {
    id: generateId(),
    userId,
    amount,
    type,
    categoryId: needsCategoryConfirm ? null : classification.categoryId,
    categoryConfidence: classification.confidence,
    merchantType: 'unknown',
    merchantName: parseMerchant(fullText),
    personName: null,
    bankName,
    accountLast4: acctMatch ? acctMatch[1] : null,
    availableBalance: parseBalance(fullText),
    rawSms: email.body,                      // email body stored as raw content
    smsId: `email:${email.id}`,             // namespaced dedup key
    senderAddress: email.from,
    parsedAt: now,
    transactionDate: parseTransactionDate(email.subject, email.body) ?? email.date,
    referenceNumber: fullText.match(refRe)?.[1] ?? null,
    upiId: fullText.match(upiRe)?.[1] ?? null,
    isEmi: emiResult.isEmi,
    emiId: null,
    isSplit: false,
    splitId: null,
    isLedger: false,
    ledgerEntryId: null,
    tags: [],
    note: null,
    syncedAt: null,
    source: 'email',
    gmailAccount: gmailAccount ?? null,
    createdAt: now,
    updatedAt: now,
  };

  return { tx, needsCategoryConfirm, emiDetected: emiResult.isEmi };
}

export interface EmailImportResult {
  imported: number;
  duplicates: number;
  skipped: number;   // non-transaction emails (OTPs, promotions, etc.)
  failed: number;
  pendingCategoryConfirm: string[];
  emiDetected: string[];
}

export const EmailParser = {
  async parseAndStore(emails: RawEmail[], userId: string, gmailAccount?: string): Promise<EmailImportResult> {
    const result: EmailImportResult = {
      imported: 0,
      duplicates: 0,
      skipped: 0,
      failed: 0,
      pendingCategoryConfirm: [],
      emiDetected: [],
    };

    for (const email of emails) {
      try {
        const existing = await TransactionRepository.findBySmsId(`email:${email.id}`);
        if (existing) { result.duplicates++; continue; }

        const parsed = await parseEmail(email, userId, gmailAccount);
        if (!parsed) { result.skipped++; continue; }

        await TransactionRepository.insert(parsed.tx);
        result.imported++;
        if (parsed.needsCategoryConfirm) result.pendingCategoryConfirm.push(parsed.tx.id);
        if (parsed.emiDetected) result.emiDetected.push(parsed.tx.id);
      } catch (err) {
        console.warn('[EmailParser] Failed to process email', email.id, err);
        result.failed++;
      }
    }

    return result;
  },
};
