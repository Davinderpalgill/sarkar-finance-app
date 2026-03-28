import { useCallback } from 'react';
import { useUiStore } from '../store/uiStore';
import { syncAll } from '../api/firebase/syncManager';

export function useSync() {
  const { userId, syncing, lastSyncedAt, syncError, setSyncing, setSyncError, setLastSyncedAt } = useUiStore();

  const sync = useCallback(async () => {
    if (!userId || syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await syncAll(userId);
      setLastSyncedAt(Date.now());
    } catch (e: any) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
  }, [userId, syncing]);

  return { sync, syncing, lastSyncedAt, syncError };
}
