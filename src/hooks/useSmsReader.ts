import { useState, useCallback } from 'react';
import { usePermissions } from './usePermissions';
import { importHistoricalSms, SmsImportResult } from '../services/SmsService';
import { useUiStore } from '../store/uiStore';

export function useSmsReader() {
  const { hasSmsPermission, requestAll } = usePermissions();
  const userId = useUiStore(s => s.userId);
  const showCategoryPopup = useUiStore(s => s.showCategoryPopup);

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<SmsImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importSms = useCallback(async () => {
    if (!userId) return;
    setImporting(true);
    setError(null);

    try {
      if (!hasSmsPermission()) {
        const granted = await requestAll();
        if (!granted) {
          setError('SMS permission is required to import transactions.');
          setImporting(false);
          return;
        }
      }

      const importResult = await importHistoricalSms(userId);
      setResult(importResult);

      // Show category popup for first uncategorized transaction
      if (importResult.pendingCategoryConfirm.length > 0) {
        showCategoryPopup(importResult.pendingCategoryConfirm[0]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }, [userId, hasSmsPermission, requestAll, showCategoryPopup]);

  return { importing, result, error, importSms };
}
