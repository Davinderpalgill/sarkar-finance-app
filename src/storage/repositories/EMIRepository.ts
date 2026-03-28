import { getDatabase } from '../database';
import { EMI, EmiInstallment } from '../../models/EMI';

function rowToEmi(row: any): EMI {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    lenderName: row.lender_name,
    principalAmount: row.principal_amount,
    emiAmount: row.emi_amount,
    totalInstallments: row.total_installments,
    paidInstallments: row.paid_installments,
    startDate: row.start_date,
    nextDueDate: row.next_due_date,
    endDate: row.end_date,
    interestRate: row.interest_rate,
    loanAccountNumber: row.loan_account_number,
    status: row.status,
    transactionIds: JSON.parse(row.transaction_ids || '[]'),
    detectedFromSms: !!row.detected_from_sms,
    detectionConfidence: row.detection_confidence,
    reminderDaysBefore: row.reminder_days_before,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const EMIRepository = {
  async insert(emi: EMI): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO emis
        (id, user_id, name, lender_name, principal_amount, emi_amount,
         total_installments, paid_installments, start_date, next_due_date,
         end_date, interest_rate, loan_account_number, status, transaction_ids,
         detected_from_sms, detection_confidence, reminder_days_before,
         synced_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        emi.id, emi.userId, emi.name, emi.lenderName,
        emi.principalAmount, emi.emiAmount,
        emi.totalInstallments, emi.paidInstallments,
        emi.startDate, emi.nextDueDate, emi.endDate,
        emi.interestRate, emi.loanAccountNumber,
        emi.status, JSON.stringify(emi.transactionIds),
        emi.detectedFromSms ? 1 : 0,
        emi.detectionConfidence, emi.reminderDaysBefore,
        null, emi.createdAt, emi.updatedAt,
      ]
    );
  },

  async update(emi: Partial<EMI> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE emis SET
        name=?, lender_name=?, emi_amount=?, total_installments=?,
        paid_installments=?, next_due_date=?, end_date=?, status=?,
        transaction_ids=?, reminder_days_before=?, updated_at=?
       WHERE id=?`,
      [
        emi.name ?? '', emi.lenderName ?? '',
        emi.emiAmount ?? 0, emi.totalInstallments ?? 0,
        emi.paidInstallments ?? 0, emi.nextDueDate ?? 0,
        emi.endDate ?? 0, emi.status ?? 'active',
        JSON.stringify(emi.transactionIds ?? []),
        emi.reminderDaysBefore ?? 3,
        Date.now(), emi.id,
      ]
    );
  },

  async findById(id: string): Promise<EMI | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM emis WHERE id=?', [id]);
    return result.rows.length > 0 ? rowToEmi(result.rows.item(0)) : null;
  },

  async findByUser(userId: string, status?: EMI['status']): Promise<EMI[]> {
    const db = await getDatabase();
    const sql = status
      ? 'SELECT * FROM emis WHERE user_id=? AND status=? ORDER BY next_due_date'
      : 'SELECT * FROM emis WHERE user_id=? ORDER BY next_due_date';
    const params = status ? [userId, status] : [userId];
    const [result] = await db.executeSql(sql, params);
    const emis: EMI[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      emis.push(rowToEmi(result.rows.item(i)));
    }
    return emis;
  },

  async getUpcomingDue(userId: string, withinDays: number): Promise<EMI[]> {
    const db = await getDatabase();
    const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
    const [result] = await db.executeSql(
      `SELECT * FROM emis WHERE user_id=? AND status='active'
       AND next_due_date <= ? ORDER BY next_due_date`,
      [userId, cutoff]
    );
    const emis: EMI[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      emis.push(rowToEmi(result.rows.item(i)));
    }
    return emis;
  },

  async markInstallmentPaid(
    emiId: string,
    installmentId: string,
    transactionId: string | null
  ): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.executeSql(
      'UPDATE emi_installments SET paid=1, paid_at=?, transaction_id=? WHERE id=?',
      [now, transactionId, installmentId]
    );
    await db.executeSql(
      'UPDATE emis SET paid_installments=paid_installments+1, updated_at=? WHERE id=?',
      [now, emiId]
    );
  },

  async insertInstallment(inst: EmiInstallment): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO emi_installments
        (id, emi_id, installment_number, due_date, amount, paid, paid_at, transaction_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        inst.id, inst.emiId, inst.installmentNumber,
        inst.dueDate, inst.amount, inst.paid ? 1 : 0,
        inst.paidAt, inst.transactionId,
      ]
    );
  },

  async getInstallments(emiId: string): Promise<EmiInstallment[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM emi_installments WHERE emi_id=? ORDER BY installment_number',
      [emiId]
    );
    const items: EmiInstallment[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      items.push({
        id: row.id,
        emiId: row.emi_id,
        installmentNumber: row.installment_number,
        dueDate: row.due_date,
        amount: row.amount,
        paid: !!row.paid,
        paidAt: row.paid_at,
        transactionId: row.transaction_id,
      });
    }
    return items;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM emis WHERE id=?', [id]);
  },
};
