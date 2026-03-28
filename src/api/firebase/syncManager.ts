import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionRepository } from '../../storage/repositories/TransactionRepository';
import { EMIRepository } from '../../storage/repositories/EMIRepository';
import { LedgerRepository } from '../../storage/repositories/LedgerRepository';
import { GroupRepository } from '../../storage/repositories/GroupRepository';
import {
  upsertTransaction, fetchTransactionsSince,
  upsertEmi, fetchEmisSince,
  upsertLedgerEntry, fetchLedgerSince,
  upsertGroup, fetchGroupsSince,
} from './firestore';
import { Transaction } from '../../models/Transaction';
import { EMI } from '../../models/EMI';
import { LedgerEntry } from '../../models/LedgerEntry';

const LAST_SYNC_KEY = 'LAST_SYNC_TIMESTAMP';

export async function getLastSyncTime(): Promise<number> {
  const val = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return val ? parseInt(val, 10) : 0;
}

async function setLastSyncTime(ts: number): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(ts));
}

/**
 * Bi-directional sync with last-write-wins conflict resolution (by updatedAt).
 * - Pushes unsynced local records to Firestore.
 * - Pulls remote records modified since last sync and upserts locally.
 */
export async function syncAll(userId: string): Promise<void> {
  const since = await getLastSyncTime();
  const syncStart = Date.now();

  await Promise.all([
    syncTransactions(userId, since),
    syncEmis(userId, since),
    syncLedger(userId, since),
    syncGroups(userId, since),
  ]);

  await setLastSyncTime(syncStart);
}

// ── Transactions ─────────────────────────────────────────────────────────────

async function syncTransactions(userId: string, since: number): Promise<void> {
  // Push local unsynced
  const unsynced = await TransactionRepository.getUnsyncedByUser(userId);
  await Promise.all(
    unsynced.map(async tx => {
      await upsertTransaction(userId, tx);
      await TransactionRepository.markSynced(tx.id);
    })
  );

  // Pull remote
  const remoteTxs = await fetchTransactionsSince(userId, since);
  for (const remote of remoteTxs) {
    const local = await TransactionRepository.findById(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      // Remote wins — upsert locally (without rawSms, keep local rawSms if exists)
      const merged: Transaction = {
        rawSms: local?.rawSms ?? '',
        ...remote,
      };
      await TransactionRepository.insert(merged);
      await TransactionRepository.update({ ...merged, syncedAt: Date.now() });
    }
  }
}

// ── EMIs ──────────────────────────────────────────────────────────────────────

async function syncEmis(userId: string, since: number): Promise<void> {
  const localEmis = await EMIRepository.findByUser(userId);
  await Promise.all(
    localEmis
      .filter(e => !e.createdAt) // naive "unsynced" check; refine with synced_at column
      .map(e => upsertEmi(userId, e))
  );

  const remoteEmis = await fetchEmisSince(userId, since);
  for (const remote of remoteEmis) {
    const local = await EMIRepository.findById(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      await EMIRepository.insert(remote);
    }
  }
}

// ── Ledger ────────────────────────────────────────────────────────────────────

async function syncLedger(userId: string, since: number): Promise<void> {
  const localEntries = await LedgerRepository.findByUser(userId);
  await Promise.all(localEntries.map(e => upsertLedgerEntry(userId, e)));

  const remoteEntries = await fetchLedgerSince(userId, since);
  for (const remote of remoteEntries) {
    const local = await LedgerRepository.findById(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      await LedgerRepository.insert(remote);
    }
  }
}

// ── Groups ────────────────────────────────────────────────────────────────────

async function syncGroups(userId: string, since: number): Promise<void> {
  const localGroups = await GroupRepository.findByUser(userId);
  await Promise.all(localGroups.map(g => upsertGroup(g)));

  const remoteGroups = await fetchGroupsSince(userId, since);
  for (const remote of remoteGroups) {
    const local = await GroupRepository.findById(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      await GroupRepository.insert(remote);
    }
  }
}
