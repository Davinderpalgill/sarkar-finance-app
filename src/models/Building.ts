export interface Building {
  id: string;
  userId: string;
  name: string;
  address: string;
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}
