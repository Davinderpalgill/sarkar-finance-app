export type MaintenanceCategory =
  | 'repair' | 'cleaning' | 'electrical' | 'plumbing'
  | 'painting' | 'general' | 'other';

export interface MaintenanceLog {
  id: string;
  buildingId: string;
  unitId: string | null;
  userId: string;
  title: string;
  amount: number;           // paise
  category: MaintenanceCategory;
  description: string | null;
  date: number;             // epoch ms
  createdAt: number;
  updatedAt: number;
}
