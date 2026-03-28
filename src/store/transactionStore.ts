import { create } from 'zustand';
import { Transaction } from '../models/Transaction';
import { TransactionRepository, AccountSummary } from '../storage/repositories/TransactionRepository';
import { CONSTANTS } from '../config/constants';

interface TransactionState {
  transactions: Transaction[];
  uncategorized: Transaction[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  currentOffset: number;
  error: string | null;

  loadTransactions: (userId: string, options?: Parameters<typeof TransactionRepository.findByUser>[1]) => Promise<void>;
  loadMoreTransactions: (userId: string, options?: Parameters<typeof TransactionRepository.findByUser>[1]) => Promise<void>;
  loadUncategorized: (userId: string) => Promise<void>;
  assignCategory: (txId: string, categoryId: string, confidence: number) => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (tx: Partial<Transaction> & { id: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearAllTransactions: (userId: string) => Promise<void>;
  getSummary: (userId: string, fromDate: number, toDate: number) => Promise<{ totalCredit: number; totalDebit: number; count: number }>;
  getMonthlyTrend: (userId: string, fromMs: number, toMs: number, accountFilter?: { bankName: string; accountLast4: string | null } | null) => Promise<Array<{ month: string; totalCredit: number; totalDebit: number }>>;
  getAccounts: (userId: string) => Promise<AccountSummary[]>;
  getCategoryBreakdown: (userId: string, fromDate: number, toDate: number) => Promise<Array<{ categoryId: string | null; totalDebit: number; totalCredit: number; count: number }>>;
  getTopMerchants: (userId: string, fromDate: number, toDate: number, limit?: number) => Promise<Array<{ merchantName: string; count: number; total: number }>>;
  getDayOfWeekPattern: (userId: string, fromDate: number, toDate: number) => Promise<Array<{ dow: number; total: number; count: number }>>;
  getRecurringTransactions: (userId: string) => Promise<Array<{ merchantName: string; monthCount: number; totalCount: number; avgAmount: number; totalAmount: number }>>;
  getCategoryTrend: (userId: string, categoryId: string, fromMs: number, toMs: number) => Promise<Array<{ month: string; total: number; count: number }>>;
  getIncomeBreakdown: (userId: string, fromDate: number, toDate: number) => Promise<Array<{ categoryId: string | null; total: number; count: number }>>;
  getLatestBalancePerAccount: (userId: string) => Promise<Array<{ bankName: string; accountLast4: string | null; availableBalance: number; lastDate: number }>>;
}

export type { AccountSummary };

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  uncategorized: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  currentOffset: 0,
  error: null,

  loadTransactions: async (userId, options = {}) => {
    set({ loading: true, error: null, currentOffset: 0 });
    try {
      const txs = await TransactionRepository.findByUser(userId, {
        ...options,
        limit: CONSTANTS.DEFAULT_PAGE_SIZE,
        offset: 0,
      });
      set({
        transactions: txs,
        loading: false,
        currentOffset: txs.length,
        hasMore: txs.length === CONSTANTS.DEFAULT_PAGE_SIZE,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadMoreTransactions: async (userId, options = {}) => {
    const { loadingMore, hasMore, currentOffset, transactions } = get();
    if (loadingMore || !hasMore) return;
    set({ loadingMore: true });
    try {
      const txs = await TransactionRepository.findByUser(userId, {
        ...options,
        limit: CONSTANTS.DEFAULT_PAGE_SIZE,
        offset: currentOffset,
      });
      set({
        transactions: [...transactions, ...txs],
        loadingMore: false,
        currentOffset: currentOffset + txs.length,
        hasMore: txs.length === CONSTANTS.DEFAULT_PAGE_SIZE,
      });
    } catch (e: any) {
      set({ loadingMore: false, error: e.message });
    }
  },

  loadUncategorized: async (userId) => {
    const txs = await TransactionRepository.findByUser(userId, { uncategorized: true });
    set({ uncategorized: txs });
  },

  assignCategory: async (txId, categoryId, confidence) => {
    await TransactionRepository.assignCategory(txId, categoryId, confidence);
    set(state => ({
      uncategorized: state.uncategorized.filter(t => t.id !== txId),
      transactions: state.transactions.map(t =>
        t.id === txId ? { ...t, categoryId, categoryConfidence: confidence } : t
      ),
    }));
  },

  addTransaction: (tx) => {
    set(state => ({ transactions: [tx, ...state.transactions] }));
    if (!tx.categoryId) {
      set(state => ({ uncategorized: [tx, ...state.uncategorized] }));
    }
  },

  updateTransaction: async (tx) => {
    await TransactionRepository.update(tx);
    set(state => ({
      transactions: state.transactions.map(t =>
        t.id === tx.id ? { ...t, ...tx } : t
      ),
    }));
  },

  deleteTransaction: async (id) => {
    await TransactionRepository.delete(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
      uncategorized: state.uncategorized.filter(t => t.id !== id),
    }));
  },

  clearAllTransactions: async (userId) => {
    await TransactionRepository.deleteAll(userId);
    set({ transactions: [], uncategorized: [], currentOffset: 0, hasMore: true });
  },

  getSummary: (userId, fromDate, toDate) =>
    TransactionRepository.getSummary(userId, fromDate, toDate),

  getMonthlyTrend: (userId, fromMs, toMs, accountFilter) =>
    TransactionRepository.getMonthlyTrend(userId, fromMs, toMs, accountFilter),

  getAccounts: (userId) =>
    TransactionRepository.getAccounts(userId),

  getCategoryBreakdown: (userId, fromDate, toDate) =>
    TransactionRepository.getCategoryBreakdown(userId, fromDate, toDate),

  getTopMerchants: (userId, fromDate, toDate, limit) =>
    TransactionRepository.getTopMerchants(userId, fromDate, toDate, limit),

  getDayOfWeekPattern: (userId, fromDate, toDate) =>
    TransactionRepository.getDayOfWeekPattern(userId, fromDate, toDate),

  getRecurringTransactions: (userId) =>
    TransactionRepository.getRecurringTransactions(userId),

  getCategoryTrend: (userId, categoryId, fromMs, toMs) =>
    TransactionRepository.getCategoryTrend(userId, categoryId, fromMs, toMs),

  getIncomeBreakdown: (userId, fromDate, toDate) =>
    TransactionRepository.getIncomeBreakdown(userId, fromDate, toDate),

  getLatestBalancePerAccount: (userId) =>
    TransactionRepository.getLatestBalancePerAccount(userId),
}));
