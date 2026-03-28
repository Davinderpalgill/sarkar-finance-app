import { generateId } from '../utils/generateId';
import { Transaction } from '../models/Transaction';
import { applyBankPattern } from './BankPatterns';
import { detectMerchantOrPerson } from './MerchantDetector';
import { isEmiSms } from './EMIDetector';
import { classifyCategory, requiresUserConfirmation } from './CategoryClassifier';

export interface RawSmsInput {
  id: string;          // native SMS id
  address: string;     // sender address
  body: string;
  date: number;        // epoch ms
}

export interface ParseResult {
  transaction: Transaction;
  needsCategoryConfirm: boolean;
  emiDetected: boolean;
  emiInfo: ReturnType<typeof isEmiSms>;
}

/**
 * Full 7-step SMS parsing pipeline.
 * Returns null if the SMS cannot be recognised as a financial transaction.
 */
export async function parseSms(
  sms: RawSmsInput,
  userId: string
): Promise<ParseResult | null> {

  // Step 1 & 2: Bank detection + regex parsing
  const fields = applyBankPattern(sms.address, sms.body);
  if (!fields || fields.amount === null || fields.type === null) {
    return null;
  }

  // Step 3 (ML Kit entity fallback handled natively; JS receives pre-parsed fields)

  // Step 4: TFLite classification
  const classification = await classifyCategory(sms.body);

  // Step 5: Merchant vs person detection
  const merchantResult = detectMerchantOrPerson(
    fields.merchantOrPerson,
    fields.upiId,
    sms.body
  );

  // Step 6: EMI detection
  const emiResult = isEmiSms(sms.body);

  // Step 7: Confidence gate
  const needsCategoryConfirm = requiresUserConfirmation(classification.confidence);
  const now = Date.now();

  const transaction: Transaction = {
    id: generateId(),
    userId,
    amount: fields.amount,
    type: fields.type,
    categoryId: needsCategoryConfirm ? null : classification.categoryId,
    categoryConfidence: classification.confidence,
    merchantType: merchantResult.merchantType,
    merchantName: merchantResult.merchantName,
    personName: merchantResult.personName,
    bankName: fields.bankName,
    accountLast4: fields.accountLast4,
    availableBalance: fields.availableBalance,
    rawSms: sms.body,
    smsId: sms.id,
    senderAddress: sms.address,
    parsedAt: now,
    transactionDate: sms.date,
    referenceNumber: fields.referenceNumber,
    upiId: fields.upiId,
    isEmi: emiResult.isEmi,
    emiId: null,
    isSplit: false,
    splitId: null,
    isLedger: false,
    ledgerEntryId: null,
    tags: [],
    note: null,
    source: 'sms',
    syncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    transaction,
    needsCategoryConfirm,
    emiDetected: emiResult.isEmi,
    emiInfo: emiResult,
  };
}
