import { useEffect } from 'react';
import { useLedgerStore } from '../store/ledgerStore';
import { useUiStore } from '../store/uiStore';

export function useLedger() {
  const userId = useUiStore(s => s.userId);
  const { lentEntries, borrowedEntries, loading, error, loadLedger } = useLedgerStore();

  useEffect(() => {
    if (userId) loadLedger(userId);
  }, [userId]);

  return { lentEntries, borrowedEntries, loading, error };
}
