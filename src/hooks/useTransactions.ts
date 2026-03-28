import { useEffect } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';

export function useTransactions(options: Parameters<typeof useTransactionStore.getState['loadTransactions']>[1] = {}) {
  const userId = useUiStore(s => s.userId);
  const { transactions, loading, error, loadTransactions } = useTransactionStore();

  useEffect(() => {
    if (userId) {
      loadTransactions(userId, options);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { transactions, loading, error };
}
