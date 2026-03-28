import { SplitMethod } from './Group';

export interface ShareEntry {
  memberId: string;
  shareAmount: number;   // paise
  paid: boolean;
  paidAt: number | null; // epoch ms
}

export interface Split {
  id: string;
  groupId: string;
  paidBy: string;          // memberId (userId or generated id)
  description: string;
  totalAmount: number;     // paise
  splitMethod: SplitMethod;
  shares: ShareEntry[];
  categoryId: string | null;
  transactionId: string | null;
  date: number;            // epoch ms
  syncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// Computed balance entry after debt simplification
export interface GroupBalance {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;         // paise
  settled: boolean;
  settledAt: number | null;
  updatedAt: number;
}
