import { create } from 'zustand';
import { Budget } from '../models/Budget';
import { BudgetRepository } from '../storage/repositories/BudgetRepository';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;

  loadBudgets: (userId: string, month: string) => Promise<void>;
  saveBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,

  loadBudgets: async (userId, month) => {
    set({ loading: true });
    try {
      const budgets = await BudgetRepository.findByMonth(userId, month);
      set({ budgets, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveBudget: async (budget) => {
    await BudgetRepository.upsert(budget);
    const { budgets } = get();
    const exists = budgets.findIndex(b => b.id === budget.id);
    if (exists >= 0) {
      set({ budgets: budgets.map(b => (b.id === budget.id ? budget : b)) });
    } else {
      set({ budgets: [...budgets, budget] });
    }
  },

  deleteBudget: async (id) => {
    await BudgetRepository.delete(id);
    set(state => ({ budgets: state.budgets.filter(b => b.id !== id) }));
  },
}));
