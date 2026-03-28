export interface Budget {
  id: string;
  userId: string;
  month: string;          // 'YYYY-MM'
  categoryId: string | null;  // null = overall monthly limit
  limitAmount: number;    // paise
  createdAt: number;
  updatedAt: number;
}
