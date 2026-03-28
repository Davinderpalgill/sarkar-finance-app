export type RentTenantStatus = 'active' | 'inactive';

export type TenantDocType = 'aadhaar' | 'photo' | 'agreement';

export interface TenantDocument {
  type: TenantDocType;
  uri: string;
  name: string;
}

export interface RentTenant {
  id: string;
  unitId: string;
  buildingId: string;
  userId: string;
  name: string;
  phone: string;
  whatsappNumber: string | null;
  leaseStart: number;       // epoch ms
  leaseEnd: number | null;  // epoch ms
  monthlyRent: number;      // paise
  dueDay: number;           // 1–28
  escalationRate: number;   // annual % e.g. 5 = 5%
  depositReturned: boolean;
  status: RentTenantStatus;
  documents: TenantDocument[];
  createdAt: number;
  updatedAt: number;
}
