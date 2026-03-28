export type RentRecordStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type PaymentMode = 'cash' | 'upi' | 'bank' | 'mapped';

export interface ExtraCharge {
  label: string;
  amount: number; // paise
}

export interface RentRecord {
  id: string;
  tenantId: string;
  unitId: string;
  buildingId: string;
  userId: string;
  month: string;              // YYYY-MM
  amountDue: number;          // paise (base rent)
  lateFee: number;            // paise
  extraCharges: ExtraCharge[]; // electricity, food, etc.
  amountPaid: number;         // paise
  paymentDate: number | null; // epoch ms
  paymentMode: PaymentMode | null;
  transactionId: string | null;
  status: RentRecordStatus;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}
