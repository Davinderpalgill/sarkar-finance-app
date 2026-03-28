import { useEffect } from 'react';
import { useEmiStore } from '../store/emiStore';
import { useUiStore } from '../store/uiStore';

export function useEMI() {
  const userId = useUiStore(s => s.userId);
  const { emis, loading, error, loadEmis } = useEmiStore();

  useEffect(() => {
    if (userId) loadEmis(userId);
  }, [userId]);

  return { emis, loading, error };
}
