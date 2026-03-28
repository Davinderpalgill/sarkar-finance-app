export type RentUnitStatus = 'occupied' | 'vacant';

export interface RentUnit {
  id: string;
  buildingId: string;
  userId: string;
  unitNumber: string;
  monthlyRent: number;      // paise
  securityDeposit: number;  // paise
  status: RentUnitStatus;
  tenantId: string | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}
