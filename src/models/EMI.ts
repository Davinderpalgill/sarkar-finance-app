export type EmiStatus = 'active' | 'completed' | 'defaulted' | 'paused';

export interface EMI {
  id: string;
  userId: string;
  name: string;
  lenderName: string;
  principalAmount: number;    // paise
  emiAmount: number;          // paise
  totalInstallments: number;
  paidInstallments: number;
  startDate: number;          // epoch ms
  nextDueDate: number;        // epoch ms
  endDate: number;            // epoch ms
  interestRate: number | null; // percentage
  loanAccountNumber: string | null;
  status: EmiStatus;
  transactionIds: string[];
  detectedFromSms: boolean;
  detectionConfidence: number;
  reminderDaysBefore: number;
  createdAt: number;
  updatedAt: number;
}

export interface EmiInstallment {
  id: string;
  emiId: string;
  installmentNumber: number;
  dueDate: number;            // epoch ms
  amount: number;             // paise
  paid: boolean;
  paidAt: number | null;      // epoch ms
  transactionId: string | null;
}
