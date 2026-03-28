import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';
import { parseSms, RawSmsInput, ParseResult } from '../ml/SmsParser';
import { TransactionRepository } from '../storage/repositories/TransactionRepository';
import { CONSTANTS } from '../config/constants';

const { SmsModule, SmsEventEmitter: NativeSmsEventEmitter } = NativeModules;

export interface SmsImportResult {
  imported: number;
  duplicates: number;
  failed: number;
  pendingCategoryConfirm: string[];  // transaction IDs needing user category input
  emiDetected: string[];             // transaction IDs flagged as EMI
}

/**
 * Import historical bank SMS from device inbox.
 * De-duplicates by smsId; passes each through the full parsing pipeline.
 */
export async function importHistoricalSms(userId: string): Promise<SmsImportResult> {
  const lookbackMs = CONSTANTS.SMS_IMPORT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const rawMessages: RawSmsInput[] = await SmsModule.readInboxSms(lookbackMs);

  const result: SmsImportResult = {
    imported: 0,
    duplicates: 0,
    failed: 0,
    pendingCategoryConfirm: [],
    emiDetected: [],
  };

  for (const sms of rawMessages) {
    try {
      // De-duplicate
      const existing = await TransactionRepository.findBySmsId(sms.id);
      if (existing) {
        result.duplicates++;
        continue;
      }

      const parsed = await parseSms(sms, userId);
      if (!parsed) {
        result.failed++;
        continue;
      }

      await TransactionRepository.insert(parsed.transaction);
      result.imported++;

      if (parsed.needsCategoryConfirm) {
        result.pendingCategoryConfirm.push(parsed.transaction.id);
      }
      if (parsed.emiDetected) {
        result.emiDetected.push(parsed.transaction.id);
      }
    } catch (err) {
      console.warn('[SmsService] Failed to process SMS', sms.id, err);
      result.failed++;
    }
  }

  return result;
}

/**
 * Subscribe to real-time incoming SMS events.
 * Returns an unsubscribe function.
 */
export function subscribeToIncomingSms(
  userId: string,
  onTransaction: (result: ParseResult) => void
): EmitterSubscription {
  const emitter = new NativeEventEmitter(NativeSmsEventEmitter);
  return emitter.addListener('SMS_RECEIVED', async (sms: RawSmsInput) => {
    try {
      const parsed = await parseSms(sms, userId);
      if (!parsed) return;

      const existing = await TransactionRepository.findBySmsId(sms.id);
      if (existing) return;

      await TransactionRepository.insert(parsed.transaction);
      onTransaction(parsed);
    } catch (err) {
      console.warn('[SmsService] Failed to process incoming SMS', err);
    }
  });
}
