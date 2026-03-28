import { create } from 'zustand';
import { Group, GroupMember } from '../models/Group';
import { Split, GroupBalance, ShareEntry } from '../models/Split';
import { GroupRepository } from '../storage/repositories/GroupRepository';
import { upsertGroup, upsertSplit } from '../api/firebase/firestore';

interface GroupState {
  groups: Group[];
  splits: Record<string, Split[]>; // groupId → splits
  balances: Record<string, GroupBalance[]>; // groupId → balances
  loading: boolean;
  error: string | null;

  loadGroups: (userId: string) => Promise<void>;
  createGroup: (group: Group) => Promise<void>;
  loadSplits: (groupId: string) => Promise<void>;
  addSplit: (split: Split) => Promise<void>;
  computeBalances: (groupId: string) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  splits: {},
  balances: {},
  loading: false,
  error: null,

  loadGroups: async (userId) => {
    set({ loading: true });
    try {
      const groups = await GroupRepository.findByUser(userId);
      set({ groups, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createGroup: async (group) => {
    await GroupRepository.insert(group);
    await upsertGroup(group);
    set(state => ({ groups: [group, ...state.groups] }));
  },

  loadSplits: async (groupId) => {
    const splits = await GroupRepository.getSplitsByGroup(groupId);
    set(state => ({ splits: { ...state.splits, [groupId]: splits } }));
    get().computeBalances(groupId);
  },

  addSplit: async (split) => {
    await GroupRepository.insertSplit(split);
    await upsertSplit(split);
    set(state => ({
      splits: {
        ...state.splits,
        [split.groupId]: [split, ...(state.splits[split.groupId] ?? [])],
      },
    }));
    get().computeBalances(split.groupId);
  },

  computeBalances: (groupId) => {
    const splits = get().splits[groupId] ?? [];
    const group  = get().groups.find(g => g.id === groupId);
    if (!group) return;

    // Net balance: positive = owed to you, negative = you owe
    const netBalance: Record<string, Record<string, number>> = {};

    for (const split of splits) {
      for (const share of split.shares) {
        if (share.memberId === split.paidBy || share.paid) continue;
        const from = share.memberId;
        const to   = split.paidBy;

        netBalance[from] = netBalance[from] ?? {};
        netBalance[from][to] = (netBalance[from][to] ?? 0) + share.shareAmount;
      }
    }

    // Debt simplification: greedy algorithm
    const balances = simplifyDebts(netBalance, groupId);
    set(state => ({ balances: { ...state.balances, [groupId]: balances } }));
  },
}));

/**
 * Greedy debt simplification.
 * Minimizes the number of transactions needed to settle all debts within a group.
 */
function simplifyDebts(
  netBalance: Record<string, Record<string, number>>,
  groupId: string
): GroupBalance[] {
  // Compute net amounts per member
  const net: Record<string, number> = {};
  for (const [from, tos] of Object.entries(netBalance)) {
    for (const [to, amount] of Object.entries(tos)) {
      net[from] = (net[from] ?? 0) - amount;
      net[to]   = (net[to]   ?? 0) + amount;
    }
  }

  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors:   Array<{ id: string; amount: number }> = [];

  for (const [id, amount] of Object.entries(net)) {
    if (amount > 0) creditors.push({ id, amount });
    else if (amount < 0) debtors.push({ id, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result: GroupBalance[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt   = debtors[di];
    const settle = Math.min(credit.amount, debt.amount);

    result.push({
      id: `${debt.id}_${credit.id}`,
      groupId,
      fromMemberId: debt.id,
      toMemberId:   credit.id,
      amount: settle,
      settled: false,
      settledAt: null,
      updatedAt: Date.now(),
    });

    credit.amount -= settle;
    debt.amount   -= settle;

    if (credit.amount === 0) ci++;
    if (debt.amount === 0)   di++;
  }

  return result;
}
