import { getDatabase } from '../database';
import { Budget } from '../../models/Budget';

function rowToBudget(row: any): Budget {
  return {
    id: row.id,
    userId: row.user_id,
    month: row.month,
    categoryId: row.category_id ?? null,
    limitAmount: row.limit_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const BudgetRepository = {
  async findByMonth(userId: string, month: string): Promise<Budget[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM budgets WHERE user_id=? AND month=? ORDER BY category_id IS NULL DESC, created_at ASC',
      [userId, month]
    );
    const budgets: Budget[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      budgets.push(rowToBudget(result.rows.item(i)));
    }
    return budgets;
  },

  async upsert(budget: Budget): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR REPLACE INTO budgets
        (id, user_id, month, category_id, limit_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.id,
        budget.userId,
        budget.month,
        budget.categoryId,
        budget.limitAmount,
        budget.createdAt,
        budget.updatedAt,
      ]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM budgets WHERE id=?', [id]);
  },
};
