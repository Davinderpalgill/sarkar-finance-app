import { useEffect } from 'react';
import { useGroupStore } from '../store/groupStore';
import { useUiStore } from '../store/uiStore';

export function useGroups() {
  const userId = useUiStore(s => s.userId);
  const { groups, splits, balances, loading, error, loadGroups } = useGroupStore();

  useEffect(() => {
    if (userId) loadGroups(userId);
  }, [userId]);

  return { groups, splits, balances, loading, error };
}
