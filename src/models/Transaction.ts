export type TransactionType = 'credit' | 'debit';
export type MerchantType = 'merchant' | 'person' | 'unknown';
export type TransactionSource = 'sms' | 'aa' | 'email' | 'manual';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;              // paise (integer), never float
  type: TransactionType;
  categoryId: string | null;   // null = unclassified, triggers CategoryPopup
  categoryConfidence: number;  // 0..1
  merchantType: MerchantType;
  merchantName: string | null;
  personName: string | null;
  bankName: string;
  accountLast4: string | null;
  availableBalance: number | null; // paise
  rawSms: string;
  smsId: string;               // UNIQUE — de-duplication key
  senderAddress: string;
  parsedAt: number;            // epoch ms
  transactionDate: number;     // epoch ms
  referenceNumber: string | null;
  upiId: string | null;
  isEmi: boolean;
  emiId: string | null;
  isSplit: boolean;
  splitId: string | null;
  isLedger: boolean;
  ledgerEntryId: string | null;
  tags: string[];
  note: string | null;
  source: TransactionSource;
  gmailAccount: string | null;  // which Gmail inbox this was imported from
  syncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
