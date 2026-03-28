import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../../config/firebase';
import { Transaction } from '../../models/Transaction';
import { EMI } from '../../models/EMI';
import { LedgerEntry } from '../../models/LedgerEntry';
import { Group } from '../../models/Group';
import { Split } from '../../models/Split';

// ── Transactions ─────────────────────────────────────────────────────────────

export async function upsertTransaction(
  userId: string,
  tx: Transaction
): Promise<void> {
  // rawSms excluded from cloud storage (privacy)
  const { rawSms, ...cloudTx } = tx;
  await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.TRANSACTIONS)
    .doc(tx.id)
    .set(cloudTx, { merge: true });
}

export async function fetchTransactionsSince(
  userId: string,
  since: number
): Promise<Omit<Transaction, 'rawSms'>[]> {
  const snap = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.TRANSACTIONS)
    .where('updatedAt', '>', since)
    .orderBy('updatedAt')
    .get();
  return snap.docs.map(d => d.data() as Omit<Transaction, 'rawSms'>);
}

// ── EMIs ──────────────────────────────────────────────────────────────────────

export async function upsertEmi(userId: string, emi: EMI): Promise<void> {
  await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.EMIS)
    .doc(emi.id)
    .set(emi, { merge: true });
}

export async function fetchEmisSince(
  userId: string,
  since: number
): Promise<EMI[]> {
  const snap = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.EMIS)
    .where('updatedAt', '>', since)
    .orderBy('updatedAt')
    .get();
  return snap.docs.map(d => d.data() as EMI);
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export async function upsertLedgerEntry(
  userId: string,
  entry: LedgerEntry
): Promise<void> {
  await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.LEDGER)
    .doc(entry.id)
    .set(entry, { merge: true });
}

export async function fetchLedgerSince(
  userId: string,
  since: number
): Promise<LedgerEntry[]> {
  const snap = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .collection(COLLECTIONS.LEDGER)
    .where('updatedAt', '>', since)
    .orderBy('updatedAt')
    .get();
  return snap.docs.map(d => d.data() as LedgerEntry);
}

// ── Groups (top-level collection, shared across users) ────────────────────────

export async function upsertGroup(group: Group): Promise<void> {
  await firestore()
    .collection(COLLECTIONS.GROUPS)
    .doc(group.id)
    .set(group, { merge: true });
}

export async function upsertSplit(split: Split): Promise<void> {
  await firestore()
    .collection(COLLECTIONS.GROUPS)
    .doc(split.groupId)
    .collection(COLLECTIONS.SPLITS)
    .doc(split.id)
    .set(split, { merge: true });
}

export async function fetchGroupsSince(
  userId: string,
  since: number
): Promise<Group[]> {
  const snap = await firestore()
    .collection(COLLECTIONS.GROUPS)
    .where('updatedAt', '>', since)
    .get();
  // Filter client-side: user must be in members list
  return snap.docs
    .map(d => d.data() as Group)
    .filter(g => g.members.some(m => m.userId === userId));
}

export function listenToGroupSplits(
  groupId: string,
  onUpdate: (splits: Split[]) => void
): () => void {
  return firestore()
    .collection(COLLECTIONS.GROUPS)
    .doc(groupId)
    .collection(COLLECTIONS.SPLITS)
    .orderBy('date', 'desc')
    .onSnapshot(snap => {
      onUpdate(snap.docs.map(d => d.data() as Split));
    });
}
