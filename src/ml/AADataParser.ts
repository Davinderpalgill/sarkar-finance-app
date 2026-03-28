import { Transaction, TransactionType } from '../models/Transaction';
import { generateId } from '../utils/generateId';
import { classifyCategory, requiresUserConfirmation } from './CategoryClassifier';
import { isEmiSms } from './EMIDetector';
import { TransactionRepository } from '../storage/repositories/TransactionRepository';

// Setu AA FI data shapes (DEPOSIT and CREDIT_CARD accounts)
interface AATransaction {
  type: 'CREDIT' | 'DEBIT';
  mode: string;
  amount: number;
  currentBalance?: number;
  transactionTimestamp: string;
  valueDate?: string;
  txnId: string;
  narration: string;
  reference?: string;
}

interface AAAccountData {
  Account: {
    Transactions: {
      Transaction: AATransaction | AATransaction[];
    };
  };
}

interface AAFIItem {
  linkRefNumber?: string;
  maskedAccNumber?: string;
  fiType?: string;
  data?: AAAccountData;
}

interface AAFIPBlock {
  fipId: string;
  data?: AAFIItem[];
}

export interface AAImportResult {
  imported: number;
  duplicates: number;
  failed: number;
  pendingCategoryConfirm: string[];
  emiDetected: string[];
}

function toEpochMs(timestamp: string): number {
  const ms = Date.parse(timestamp);
  return isNaN(ms) ? Date.now() : ms;
}

function toTransactionType(aaType: 'CREDIT' | 'DEBIT'): TransactionType {
  return aaType === 'CREDIT' ? 'credit' : 'debit';
}

function extractAcctLast4(masked: string | undefined): string | null {
  if (!masked) return null;
  const digits = masked.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function detectBankFromFip(fipId: string): string {
  const upper = fipId.toUpperCase();
  if (upper.includes('HDFC')) return 'HDFC';
  if (upper.includes('SBI'))  return 'SBI';
  if (upper.includes('ICICI')) return 'ICICI';
  if (upper.includes('AXIS')) return 'Axis';
  if (upper.includes('KOTAK')) return 'Kotak';
  if (upper.includes('IDFC')) return 'IDFC';
  return fipId;
}

function parseMerchantFromNarration(narration: string): string | null {
  // UPI narration: "UPI/P2P/123/PhonePe/merchant@upi" or "UPI-merchant-ref"
  const upiParts = narration.split('/');
  if (upiParts.length >= 4) return upiParts[3].trim() || null;
  const atM = narration.match(/\bat\s+([A-Za-z0-9 &.\-']{3,40}?)(?:\s*[-/,]|$)/i);
  if (atM) return atM[1].trim();
  return null;
}

function parseUpiFromNarration(narration: string): string | null {
  const m = narration.match(/([a-z0-9.\-_+]+@[a-z]+)/i);
  return m ? m[1] : null;
}

/**
 * Parse a single Setu AA FI transaction block into a Transaction.
 * Returns null if critical fields are missing.
 */
async function parseAATransaction(
  aaTx: AATransaction,
  fipId: string,
  maskedAccNumber: string | undefined,
  userId: string,
): Promise<{ tx: Transaction; needsCategoryConfirm: boolean; emiDetected: boolean } | null> {
  if (!aaTx.txnId || aaTx.amount == null) return null;

  const narration = aaTx.narration ?? '';
  const classification = await classifyCategory(narration);
  const needsCategoryConfirm = requiresUserConfirmation(classification.confidence);
  const emiResult = isEmiSms(narration);
  const now = Date.now();

  const tx: Transaction = {
    id: generateId(),
    userId,
    amount: Math.round(aaTx.amount * 100),          // rupees → paise
    type: toTransactionType(aaTx.type),
    categoryId: needsCategoryConfirm ? null : classification.categoryId,
    categoryConfidence: classification.confidence,
    merchantType: 'unknown',
    merchantName: parseMerchantFromNarration(narration),
    personName: null,
    bankName: detectBankFromFip(fipId),
    accountLast4: extractAcctLast4(maskedAccNumber),
    availableBalance: aaTx.currentBalance != null
      ? Math.round(aaTx.currentBalance * 100)
      : null,
    rawSms: narration,                               // repurposed for narration text
    smsId: `aa:${aaTx.txnId}`,                      // namespaced dedup key
    senderAddress: fipId,                            // FIP ID as sender
    parsedAt: now,
    transactionDate: toEpochMs(aaTx.transactionTimestamp),
    referenceNumber: aaTx.reference ?? null,
    upiId: parseUpiFromNarration(narration),
    isEmi: emiResult.isEmi,
    emiId: null,
    isSplit: false,
    splitId: null,
    isLedger: false,
    ledgerEntryId: null,
    tags: [],
    note: null,
    syncedAt: null,
    source: 'aa',
    createdAt: now,
    updatedAt: now,
  };

  return { tx, needsCategoryConfirm, emiDetected: emiResult.isEmi };
}

export const AADataParser = {
  /**
   * Parse raw Setu FI data blocks and persist new transactions.
   * `fipBlocks` is the `data` array returned by GET /v2/sessions/{id}.
   */
  async parseAndStore(fipBlocks: AAFIPBlock[], userId: string): Promise<AAImportResult> {
    const result: AAImportResult = {
      imported: 0,
      duplicates: 0,
      failed: 0,
      pendingCategoryConfirm: [],
      emiDetected: [],
    };

    for (const fipBlock of fipBlocks) {
      const fipId = fipBlock.fipId ?? 'UNKNOWN-FIP';
      for (const fiItem of fipBlock.data ?? []) {
        const rawTxList = fiItem.data?.Account?.Transactions?.Transaction;
        if (!rawTxList) continue;

        // API may return a single object or an array
        const txArray: AATransaction[] = Array.isArray(rawTxList)
          ? rawTxList
          : [rawTxList];

        for (const aaTx of txArray) {
          try {
            const existing = await TransactionRepository.findBySmsId(`aa:${aaTx.txnId}`);
            if (existing) { result.duplicates++; continue; }

            const parsed = await parseAATransaction(aaTx, fipId, fiItem.maskedAccNumber, userId);
            if (!parsed) { result.failed++; continue; }

            await TransactionRepository.insert(parsed.tx);
            result.imported++;
            if (parsed.needsCategoryConfirm) result.pendingCategoryConfirm.push(parsed.tx.id);
            if (parsed.emiDetected) result.emiDetected.push(parsed.tx.id);
          } catch (err) {
            console.warn('[AADataParser] Failed to process AA tx', aaTx.txnId, err);
            result.failed++;
          }
        }
      }
    }

    return result;
  },
};
