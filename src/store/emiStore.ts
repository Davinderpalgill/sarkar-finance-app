import { create } from 'zustand';
import { EMI, EmiInstallment } from '../models/EMI';
import { EMIRepository } from '../storage/repositories/EMIRepository';
import { scheduleEmiReminder } from '../services/ReminderService';

interface EmiState {
  emis: EMI[];
  loading: boolean;
  error: string | null;

  loadEmis: (userId: string) => Promise<void>;
  addEmi: (emi: EMI) => Promise<void>;
  updateEmi: (emi: Partial<EMI> & { id: string }) => Promise<void>;
  markInstallmentPaid: (emiId: string, installmentId: string, transactionId: string | null) => Promise<void>;
  getInstallments: (emiId: string) => Promise<EmiInstallment[]>;
  getUpcomingDue: (userId: string, withinDays: number) => Promise<EMI[]>;
}

export const useEmiStore = create<EmiState>((set, get) => ({
  emis: [],
  loading: false,
  error: null,

  loadEmis: async (userId) => {
    set({ loading: true });
    try {
      const emis = await EMIRepository.findByUser(userId);
      set({ emis, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addEmi: async (emi) => {
    await EMIRepository.insert(emi);
    await scheduleEmiReminder(emi);
    set(state => ({ emis: [emi, ...state.emis] }));
  },

  updateEmi: async (emi) => {
    await EMIRepository.update(emi);
    set(state => ({
      emis: state.emis.map(e => e.id === emi.id ? { ...e, ...emi } : e),
    }));
  },

  markInstallmentPaid: async (emiId, installmentId, transactionId) => {
    await EMIRepository.markInstallmentPaid(emiId, installmentId, transactionId);
    set(state => ({
      emis: state.emis.map(e =>
        e.id === emiId
          ? { ...e, paidInstallments: e.paidInstallments + 1 }
          : e
      ),
    }));
  },

  getInstallments: (emiId) => EMIRepository.getInstallments(emiId),

  getUpcomingDue: (userId, withinDays) =>
    EMIRepository.getUpcomingDue(userId, withinDays),
}));
