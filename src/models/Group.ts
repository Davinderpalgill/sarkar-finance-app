export type SplitMethod = 'equally' | 'exact' | 'percentage' | 'shares';

export interface GroupMember {
  userId: string | null;   // null if not an app user
  name: string;
  phone: string | null;
  isAppUser: boolean;
}

export interface Group {
  id: string;
  createdBy: string;
  name: string;
  members: GroupMember[];
  totalExpenses: number;   // paise, denormalized
  currency: string;        // ISO 4217, e.g. 'INR'
  syncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
