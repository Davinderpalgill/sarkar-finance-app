import { create } from 'zustand';

interface UiState {
  // CategoryPopup
  categoryPopupVisible: boolean;
  categoryPopupTransactionId: string | null;

  // Sync
  syncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;

  // Auth
  userId: string | null;
  isOnboarded: boolean;

  showCategoryPopup: (transactionId: string) => void;
  hideCategoryPopup: () => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncedAt: (ts: number) => void;
  setUserId: (id: string | null) => void;
  setOnboarded: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  categoryPopupVisible: false,
  categoryPopupTransactionId: null,
  syncing: false,
  lastSyncedAt: null,
  syncError: null,
  userId: null,
  isOnboarded: false,

  showCategoryPopup: (transactionId) =>
    set({ categoryPopupVisible: true, categoryPopupTransactionId: transactionId }),

  hideCategoryPopup: () =>
    set({ categoryPopupVisible: false, categoryPopupTransactionId: null }),

  setSyncing: (syncing) => set({ syncing }),
  setSyncError: (syncError) => set({ syncError }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setUserId: (userId) => set({ userId }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
}));
