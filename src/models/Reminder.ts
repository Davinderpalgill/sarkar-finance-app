export type ReminderType = 'emi' | 'ledger' | 'general';

export interface Reminder {
  id: string;
  userId: string;
  type: ReminderType;
  referenceId: string;   // emiId or ledgerEntryId
  title: string;
  body: string;
  scheduledAt: number;   // epoch ms
  fired: boolean;
  cancelled: boolean;
  notifeeId: string | null; // notification id from @notifee
  createdAt: number;
}
