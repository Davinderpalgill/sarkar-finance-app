import { create } from 'zustand';
import { Building } from '../models/Building';
import { RentUnit } from '../models/RentUnit';
import { RentTenant } from '../models/RentTenant';
import { RentRecord, ExtraCharge } from '../models/RentRecord';
import { RentRepository } from '../storage/repositories/RentRepository';
import { generateId } from '../utils/generateId';

interface RentState {
  buildings: Building[];
  units: RentUnit[];
  tenants: RentTenant[];
  records: RentRecord[];
  loading: boolean;

  loadBuildings: (userId: string) => Promise<void>;
  loadUnits: (buildingId: string) => Promise<void>;
  loadTenants: (buildingId: string) => Promise<void>;
  loadMonthlyRecords: (userId: string, month: string) => Promise<void>;

  addBuilding: (userId: string, name: string, address: string) => Promise<Building>;
  updateBuilding: (id: string, name: string, address: string) => Promise<void>;
  deleteBuilding: (id: string) => Promise<void>;

  addUnit: (buildingId: string, userId: string, unitNumber: string, monthlyRent: number, securityDeposit: number) => Promise<RentUnit>;
  updateUnit: (id: string, unitNumber: string, monthlyRent: number, securityDeposit: number) => Promise<void>;
  updateUnitNote: (unitId: string, note: string | null) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;

  addTenant: (data: Omit<RentTenant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTenant: (id: string, data: Partial<RentTenant>) => Promise<void>;
  removeTenant: (tenantId: string) => Promise<void>;
  returnDeposit: (tenantId: string) => Promise<void>;

  recordPayment: (recordId: string, amountPaid: number, mode: RentRecord['paymentMode'], txId?: string, note?: string, lateFee?: number, extraCharges?: ExtraCharge[]) => Promise<void>;
  ensureMonthlyRecords: (userId: string, month: string) => Promise<void>;
}

export const useRentStore = create<RentState>((set, get) => ({
  buildings: [],
  units: [],
  tenants: [],
  records: [],
  loading: false,

  loadBuildings: async (userId) => {
    set({ loading: true });
    try {
      await RentRepository.purgeOrphanedRentData(userId);
      const buildings = await RentRepository.getBuildings(userId);
      set({ buildings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadUnits: async (buildingId) => {
    set({ loading: true });
    try {
      const units = await RentRepository.getUnits(buildingId);
      set({ units, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadTenants: async (buildingId) => {
    set({ loading: true });
    try {
      const tenants = await RentRepository.getTenants(buildingId);
      set({ tenants, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMonthlyRecords: async (userId, month) => {
    set({ loading: true });
    try {
      const records = await RentRepository.getMonthlyCollection(userId, month);
      set({ records, loading: false });
    } catch (e) {
      console.warn('loadMonthlyRecords error', e);
      set({ loading: false });
    }
  },

  addBuilding: async (userId, name, address) => {
    const now = Date.now();
    const building: Building = { id: generateId(), userId, name, address, status: 'active', createdAt: now, updatedAt: now };
    await RentRepository.insertBuilding(building);
    set(state => ({ buildings: [...state.buildings, building] }));
    return building;
  },

  updateBuilding: async (id, name, address) => {
    await RentRepository.updateBuilding({ id, name, address });
    set(state => ({
      buildings: state.buildings.map(b => b.id === id ? { ...b, name, address, updatedAt: Date.now() } : b),
    }));
  },

  deleteBuilding: async (id) => {
    // Soft-delete: archive instead of cascade-deleting so history is preserved
    await RentRepository.archiveBuilding(id);
    set(state => ({
      buildings: state.buildings.filter(b => b.id !== id),
      units: state.units.filter(u => u.buildingId !== id),
      tenants: state.tenants.filter(t => t.buildingId !== id),
      records: state.records.filter(r => r.buildingId !== id),
    }));
  },

  addUnit: async (buildingId, userId, unitNumber, monthlyRent, securityDeposit) => {
    const now = Date.now();
    const unit: RentUnit = {
      id: generateId(), buildingId, userId, unitNumber,
      monthlyRent, securityDeposit, status: 'vacant', tenantId: null,
      note: null, createdAt: now, updatedAt: now,
    };
    await RentRepository.insertUnit(unit);
    set(state => ({ units: [...state.units, unit] }));
    return unit;
  },

  updateUnit: async (id, unitNumber, monthlyRent, securityDeposit) => {
    const unit = get().units.find(u => u.id === id);
    if (!unit) return;
    await RentRepository.updateUnit({ id, unitNumber, monthlyRent, securityDeposit, status: unit.status, tenantId: unit.tenantId, note: unit.note });
    set(state => ({
      units: state.units.map(u => u.id === id ? { ...u, unitNumber, monthlyRent, securityDeposit, updatedAt: Date.now() } : u),
    }));
  },

  updateUnitNote: async (unitId, note) => {
    await RentRepository.updateUnitNote(unitId, note);
    set(state => ({
      units: state.units.map(u => u.id === unitId ? { ...u, note, updatedAt: Date.now() } : u),
    }));
  },

  deleteUnit: async (id) => {
    await RentRepository.deleteUnit(id);
    set(state => ({
      units: state.units.filter(u => u.id !== id),
      tenants: state.tenants.filter(t => t.unitId !== id),
      records: state.records.filter(r => r.unitId !== id),
    }));
  },

  addTenant: async (data) => {
    const now = Date.now();
    const tenant: RentTenant = {
      escalationRate: 0,
      depositReturned: false,
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await RentRepository.insertTenant(tenant);
    // Create rent record for current month immediately so it shows in collection
    const currentMonth = new Date().toISOString().slice(0, 7);
    await RentRepository.ensureMonthlyRecords(data.userId, currentMonth);
    set(state => ({
      tenants: [...state.tenants, tenant],
      units: state.units.map(u => u.id === tenant.unitId
        ? { ...u, status: 'occupied', tenantId: tenant.id, updatedAt: now }
        : u
      ),
    }));
  },

  updateTenant: async (id, data) => {
    await RentRepository.updateTenant({ id, ...data });
    set(state => ({
      tenants: state.tenants.map(t => t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t),
    }));
  },

  removeTenant: async (tenantId) => {
    const tenant = get().tenants.find(t => t.id === tenantId);
    await RentRepository.deactivateTenant(tenantId);
    // Reload units so we reflect the correct status (vacant vs still occupied by others)
    const updatedUnits = tenant?.buildingId
      ? await RentRepository.getUnits(tenant.buildingId)
      : get().units;
    set(state => ({
      tenants: state.tenants.map(t => t.id === tenantId ? { ...t, status: 'inactive', updatedAt: Date.now() } : t),
      units: updatedUnits,
    }));
  },

  returnDeposit: async (tenantId) => {
    await RentRepository.returnDeposit(tenantId);
    set(state => ({
      tenants: state.tenants.map(t => t.id === tenantId ? { ...t, depositReturned: true, updatedAt: Date.now() } : t),
    }));
  },

  recordPayment: async (recordId, amountPaid, mode, txId, note, lateFee, extraCharges) => {
    const record = get().records.find(r => r.id === recordId);
    if (!record) return;
    const charges = extraCharges ?? record.extraCharges ?? [];
    const extraTotal = charges.reduce((s, c) => s + c.amount, 0);
    const totalDue = record.amountDue + (lateFee ?? record.lateFee ?? 0) + extraTotal;
    const newStatus: RentRecord['status'] = amountPaid >= totalDue ? 'paid' : 'partial';
    await RentRepository.updateRentRecord({
      id: recordId,
      amountPaid,
      lateFee: lateFee ?? record.lateFee ?? 0,
      extraCharges: charges,
      paymentDate: Date.now(),
      paymentMode: mode,
      transactionId: txId ?? null,
      status: newStatus,
      note: note ?? null,
    });
    set(state => ({
      records: state.records.map(r => r.id === recordId
        ? { ...r, amountPaid, lateFee: lateFee ?? r.lateFee, extraCharges: charges, paymentDate: Date.now(), paymentMode: mode, transactionId: txId ?? null, status: newStatus, note: note ?? null, updatedAt: Date.now() }
        : r
      ),
    }));
  },

  ensureMonthlyRecords: async (userId, month) => {
    await RentRepository.ensureMonthlyRecords(userId, month);
  },
}));
