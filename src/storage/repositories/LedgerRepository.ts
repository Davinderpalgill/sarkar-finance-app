import { getDatabase } from '../database';
import { LedgerEntry, Settlement, LedgerReminder } from '../../models/LedgerEntry';

function rowToLedger(row: any): LedgerEntry {
  return {
    id: row.id,
    userId: row.user_id,
    direction: row.direction,
    personName: row.person_name,
    personPhone: row.person_phone,
    personUpiId: row.person_upi_id,
    principalAmount: row.principal_amount,
    settledAmount: row.settled_amount,
    outstandingAmount: row.principal_amount - row.settled_amount,
    transactionId: row.transaction_id,
    description: row.description,
    status: row.status,
    dueDate: row.due_date,
    reminders: [],
    settlementHistory: [],
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const LedgerRepository = {
  async insert(entry: LedgerEntry): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO ledger_entries
        (id, user_id, direction, person_name, person_phone, person_upi_id,
         principal_amount, settled_amount, transaction_id, description,
         status, due_date, synced_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        entry.id, entry.userId, entry.direction,
        entry.personName, entry.personPhone, entry.personUpiId,
        entry.principalAmount, entry.settledAmount,
        entry.transactionId, entry.description,
        entry.status, entry.dueDate,
        entry.syncedAt, entry.createdAt, entry.updatedAt,
      ]
    );
  },

  async update(entry: Partial<LedgerEntry> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE ledger_entries SET
        person_name=?, person_phone=?, person_upi_id=?,
        settled_amount=?, status=?, due_date=?, updated_at=?
       WHERE id=?`,
      [
        entry.personName ?? '', entry.personPhone ?? null,
        entry.personUpiId ?? null,
        entry.settledAmount ?? 0, entry.status ?? 'open',
        entry.dueDate ?? null, Date.now(), entry.id,
      ]
    );
  },

  async findById(id: string): Promise<LedgerEntry | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM ledger_entries WHERE id=?', [id]
    );
    if (result.rows.length === 0) return null;
    const entry = rowToLedger(result.rows.item(0));
    entry.settlementHistory = await this.getSettlements(id);
    entry.reminders = await this.getReminders(id);
    return entry;
  },

  async findByUser(
    userId: string,
    direction?: 'lent' | 'borrowed',
    status?: LedgerEntry['status']
  ): Promise<LedgerEntry[]> {
    const db = await getDatabase();
    const conditions = ['user_id=?'];
    const params: any[] = [userId];
    if (direction) { conditions.push('direction=?'); params.push(direction); }
    if (status) { conditions.push('status=?'); params.push(status); }
    const [result] = await db.executeSql(
      `SELECT * FROM ledger_entries WHERE ${conditions.join(' AND ')}
       ORDER BY due_date ASC, created_at DESC`,
      params
    );
    const entries: LedgerEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      entries.push(rowToLedger(result.rows.item(i)));
    }
    return entries;
  },

  async addSettlement(settlement: Settlement): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO settlements (id, ledger_entry_id, amount, settled_at, transaction_id, note)
       VALUES (?,?,?,?,?,?)`,
      [
        settlement.id, settlement.ledgerEntryId,
        settlement.amount, settlement.settledAt,
        settlement.transactionId, settlement.note,
      ]
    );
    // Update settled amount and status
    const [entryResult] = await db.executeSql(
      'SELECT principal_amount, settled_amount FROM ledger_entries WHERE id=?',
      [settlement.ledgerEntryId]
    );
    if (entryResult.rows.length > 0) {
      const { principal_amount, settled_amount } = entryResult.rows.item(0);
      const newSettled = settled_amount + settlement.amount;
      const newStatus = newSettled >= principal_amount
        ? 'settled'
        : newSettled > 0 ? 'partially_settled' : 'open';
      await db.executeSql(
        'UPDATE ledger_entries SET settled_amount=?, status=?, updated_at=? WHERE id=?',
        [newSettled, newStatus, Date.now(), settlement.ledgerEntryId]
      );
    }
  },

  async getSettlements(ledgerEntryId: string): Promise<Settlement[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM settlements WHERE ledger_entry_id=? ORDER BY settled_at',
      [ledgerEntryId]
    );
    const items: Settlement[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      items.push({
        id: row.id,
        ledgerEntryId: row.ledger_entry_id,
        amount: row.amount,
        settledAt: row.settled_at,
        transactionId: row.transaction_id,
        note: row.note,
      });
    }
    return items;
  },

  async addReminder(reminder: LedgerReminder): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO ledger_reminders (id, ledger_entry_id, scheduled_at, fired, cancelled)
       VALUES (?,?,?,0,0)`,
      [reminder.id, reminder.ledgerEntryId, reminder.scheduledAt]
    );
  },

  async getReminders(ledgerEntryId: string): Promise<LedgerReminder[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM ledger_reminders WHERE ledger_entry_id=? ORDER BY scheduled_at',
      [ledgerEntryId]
    );
    const items: LedgerReminder[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      items.push({
        id: row.id,
        ledgerEntryId: row.ledger_entry_id,
        scheduledAt: row.scheduled_at,
        fired: !!row.fired,
        cancelled: !!row.cancelled,
      });
    }
    return items;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM ledger_entries WHERE id=?', [id]);
  },
};
