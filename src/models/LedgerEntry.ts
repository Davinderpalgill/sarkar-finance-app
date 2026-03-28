export type LedgerDirection = 'lent' | 'borrowed';
export type LedgerStatus = 'open' | 'partially_settled' | 'settled';

export interface Settlement {
  id: string;
  ledgerEntryId: string;
  amount: number;        // paise
  settledAt: number;     // epoch ms
  transactionId: string | null;
  note: string | null;
}

export interface LedgerReminder {
  id: string;
  ledgerEntryId: string;
  scheduledAt: number;   // epoch ms
  fired: boolean;
  cancelled: boolean;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  direction: LedgerDirection;
  personName: string;
  personPhone: string | null;
  personUpiId: string | null;
  principalAmount: number;    // paise
  settledAmount: number;      // paise
  outstandingAmount: number;  // computed: principalAmount - settledAmount
  transactionId: string | null;
  description: string;
  status: LedgerStatus;
  dueDate: number | null;     // epoch ms
  reminders: LedgerReminder[];
  settlementHistory: Settlement[];
  syncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
