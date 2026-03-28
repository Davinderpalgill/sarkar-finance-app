import { getDatabase } from '../database';
import { Group } from '../../models/Group';
import { Split, GroupBalance } from '../../models/Split';

function rowToGroup(row: any): Group {
  return {
    id: row.id,
    createdBy: row.created_by,
    name: row.name,
    members: JSON.parse(row.members || '[]'),
    totalExpenses: row.total_expenses,
    currency: row.currency,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSplit(row: any): Split {
  return {
    id: row.id,
    groupId: row.group_id,
    paidBy: row.paid_by,
    description: row.description,
    totalAmount: row.total_amount,
    splitMethod: row.split_method,
    shares: JSON.parse(row.shares || '[]'),
    categoryId: row.category_id,
    transactionId: row.transaction_id,
    date: row.date,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const GroupRepository = {
  async insert(group: Group): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO groups
        (id, created_by, name, members, total_expenses, currency,
         synced_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        group.id, group.createdBy, group.name,
        JSON.stringify(group.members),
        group.totalExpenses, group.currency,
        group.syncedAt, group.createdAt, group.updatedAt,
      ]
    );
  },

  async update(group: Partial<Group> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE groups SET name=?, members=?, total_expenses=?, updated_at=? WHERE id=?',
      [
        group.name ?? '', JSON.stringify(group.members ?? []),
        group.totalExpenses ?? 0, Date.now(), group.id,
      ]
    );
  },

  async findById(id: string): Promise<Group | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM groups WHERE id=?', [id]);
    return result.rows.length > 0 ? rowToGroup(result.rows.item(0)) : null;
  },

  async findByUser(userId: string): Promise<Group[]> {
    const db = await getDatabase();
    // Groups where user is a member (JSON search by userId)
    const [result] = await db.executeSql(
      `SELECT * FROM groups WHERE members LIKE ? ORDER BY updated_at DESC`,
      [`%"userId":"${userId}"%`]
    );
    const groups: Group[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      groups.push(rowToGroup(result.rows.item(i)));
    }
    return groups;
  },

  async insertSplit(split: Split): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO splits
        (id, group_id, paid_by, description, total_amount, split_method,
         shares, category_id, transaction_id, date, synced_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        split.id, split.groupId, split.paidBy,
        split.description, split.totalAmount, split.splitMethod,
        JSON.stringify(split.shares),
        split.categoryId, split.transactionId,
        split.date, split.syncedAt, split.createdAt, split.updatedAt,
      ]
    );
    // Update group total expenses
    await db.executeSql(
      'UPDATE groups SET total_expenses=total_expenses+?, updated_at=? WHERE id=?',
      [split.totalAmount, Date.now(), split.groupId]
    );
  },

  async getSplitsByGroup(groupId: string): Promise<Split[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM splits WHERE group_id=? ORDER BY date DESC',
      [groupId]
    );
    const splits: Split[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      splits.push(rowToSplit(result.rows.item(i)));
    }
    return splits;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM groups WHERE id=?', [id]);
  },
};
