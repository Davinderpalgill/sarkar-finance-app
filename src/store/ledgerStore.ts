import { create } from 'zustand';
import { LedgerEntry, Settlement } from '../models/LedgerEntry';
import { LedgerRepository } from '../storage/repositories/LedgerRepository';
import { scheduleForLedger } from '../services/ReminderService';
import { generateId } from '../utils/generateId';

interface LedgerState {
  lentEntries: LedgerEntry[];
  borrowedEntries: LedgerEntry[];
  loading: boolean;
  error: string | null;

  loadLedger: (userId: string) => Promise<void>;
  addEntry: (entry: LedgerEntry) => Promise<void>;
  settle: (entryId: string, amount: number, transactionId: string | null, note?: string) => Promise<void>;
  getEntry: (id: string) => Promise<LedgerEntry | null>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  lentEntries: [],
  borrowedEntries: [],
  loading: false,
  error: null,

  loadLedger: async (userId) => {
    set({ loading: true });
    try {
      const lent     = await LedgerRepository.findByUser(userId, 'lent');
      const borrowed = await LedgerRepository.findByUser(userId, 'borrowed');
      set({ lentEntries: lent, borrowedEntries: borrowed, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addEntry: async (entry) => {
    await LedgerRepository.insert(entry);
    if (entry.dueDate) await scheduleForLedger(entry);
    set(state => ({
      lentEntries:     entry.direction === 'lent'     ? [entry, ...state.lentEntries]     : state.lentEntries,
      borrowedEntries: entry.direction === 'borrowed'  ? [entry, ...state.borrowedEntries] : state.borrowedEntries,
    }));
  },

  settle: async (entryId, amount, transactionId, note) => {
    const settlement: Settlement = {
      id: generateId(),
      ledgerEntryId: entryId,
      amount,
      settledAt: Date.now(),
      transactionId,
      note: note ?? null,
    };
    await LedgerRepository.addSettlement(settlement);

    // Refresh entry from DB
    const updated = await LedgerRepository.findById(entryId);
    if (!updated) return;

    const updateList = (list: LedgerEntry[]) =>
      list.map(e => e.id === entryId ? updated : e);

    set(state => ({
      lentEntries:     updateList(state.lentEntries),
      borrowedEntries: updateList(state.borrowedEntries),
    }));
  },

  getEntry: (id) => LedgerRepository.findById(id),
}));
