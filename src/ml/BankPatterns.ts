import { TransactionType } from '../models/Transaction';

export interface ParsedSmsFields {
  amount: number | null;        // paise
  type: TransactionType | null;
  merchantOrPerson: string | null;
  accountLast4: string | null;
  availableBalance: number | null; // paise
  referenceNumber: string | null;
  upiId: string | null;
  bankName: string;
}

interface BankPattern {
  senderKeywords: string[];
  bankName: string;
  parse: (body: string) => Omit<ParsedSmsFields, 'bankName'>;
}

// ── Shared regex helpers ─────────────────────────────────────────────────────

const amountRe = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const balRe    = /(?:avl\.?\s*bal(?:ance)?|bal(?:ance)?(?:\s+is)?|available\s+balance)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const refRe    = /(?:ref(?:erence)?(?:\s+no\.?)?|txn\s*id|utr|rrn)[:\s#]*([\w\d]+)/i;
const upiRe    = /([a-z0-9.\-_+]+@[a-z]+)/i;
const acctRe   = /(?:a\/c|acc(?:ount)?|card)\s*(?:no\.?|number)?[\s*xX]*(\d{4})/i;

function parseAmount(body: string): number | null {
  const m = body.match(amountRe);
  if (!m) return null;
  const rupees = parseFloat(m[1].replace(/,/g, ''));
  return Math.round(rupees * 100); // convert to paise
}

function parseBalance(body: string): number | null {
  const m = body.match(balRe);
  if (!m) return null;
  return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
}

function parseRef(body: string): string | null {
  return body.match(refRe)?.[1] ?? null;
}

function parseUpi(body: string): string | null {
  return body.match(upiRe)?.[1] ?? null;
}

function parseAcct(body: string): string | null {
  return body.match(acctRe)?.[1] ?? null;
}

function detectType(body: string): TransactionType | null {
  const lower = body.toLowerCase();
  const debitKw = ['debited', 'debit', 'spent', 'paid', 'withdrawn', 'payment of', 'sent', 'purchase'];
  const creditKw = ['credited', 'credit', 'received', 'deposited', 'refund', 'cashback', 'added'];
  const isDebit  = debitKw.some(k => lower.includes(k));
  const isCredit = creditKw.some(k => lower.includes(k));
  if (isDebit && !isCredit) return 'debit';
  if (isCredit && !isDebit) return 'credit';
  return null;
}

function parseMerchantOrPerson(body: string): string | null {
  // "at <merchant>" pattern
  const atM = body.match(/\bat\s+([A-Za-z0-9 &.\-']{3,40}?)(?:\s+on|\s+via|\s+ref|\s*\.|\s*,|$)/i);
  if (atM) return atM[1].trim();
  // "to <person/merchant>" pattern
  const toM = body.match(/\bto\s+([A-Za-z][A-Za-z ]{2,30}?)(?:\s+on|\s+via|\s+ref|\s*\.|\s*,|$)/i);
  if (toM) return toM[1].trim();
  return null;
}

// ── Bank-specific patterns ───────────────────────────────────────────────────

const PATTERNS: BankPattern[] = [
  {
    senderKeywords: ['HDFCBK', 'HDFC'],
    bankName: 'HDFC',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: parseAcct(body),
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['SBIBNK', 'SBIPSG', 'SBI'],
    bankName: 'SBI',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: parseAcct(body),
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['ICICIB', 'ICICIT', 'ICICI'],
    bankName: 'ICICI',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: parseAcct(body),
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['AXISBK', 'AXISBN', 'AXIS'],
    bankName: 'Axis',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: parseAcct(body),
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['KOTAKB', 'KOTAK'],
    bankName: 'Kotak',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: parseAcct(body),
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['IDFCFB', 'IDFC'],
    bankName: 'IDFC',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: parseAcct(body),
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['PHONEPE', 'PhonePe'],
    bankName: 'PhonePe',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: null,
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['GPAY', 'GooglePay'],
    bankName: 'GPay',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: null,
      availableBalance: null,
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
  {
    senderKeywords: ['PAYTM', 'Paytm'],
    bankName: 'Paytm',
    parse: (body) => ({
      amount: parseAmount(body),
      type: detectType(body),
      merchantOrPerson: parseMerchantOrPerson(body),
      accountLast4: null,
      availableBalance: parseBalance(body),
      referenceNumber: parseRef(body),
      upiId: parseUpi(body),
    }),
  },
];

export const SENDER_TO_BANK: Map<string, BankPattern> = new Map();
for (const pattern of PATTERNS) {
  for (const kw of pattern.senderKeywords) {
    SENDER_TO_BANK.set(kw.toUpperCase(), pattern);
  }
}

export function detectBank(senderAddress: string): BankPattern | null {
  const upper = senderAddress.toUpperCase();
  for (const [kw, pattern] of SENDER_TO_BANK) {
    if (upper.includes(kw)) return pattern;
  }
  return null;
}

export function applyBankPattern(senderAddress: string, body: string): ParsedSmsFields | null {
  const pattern = detectBank(senderAddress);
  if (!pattern) return null;
  const fields = pattern.parse(body);
  return { ...fields, bankName: pattern.bankName };
}
