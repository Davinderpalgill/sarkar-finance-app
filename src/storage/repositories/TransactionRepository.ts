import { getDatabase } from '../database';
import { Transaction, TransactionSource } from '../../models/Transaction';
import { CONSTANTS } from '../../config/constants';

export interface AccountSummary {
  bankName: string;
  accountLast4: string | null;
  totalCredit: number;
  totalDebit: number;
  transactionCount: number;
  lastActivity: number;
}

function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    categoryConfidence: row.category_confidence,
    merchantType: row.merchant_type,
    merchantName: row.merchant_name,
    personName: row.person_name,
    bankName: row.bank_name,
    accountLast4: row.account_last4,
    availableBalance: row.available_balance,
    rawSms: row.raw_sms,
    smsId: row.sms_id,
    senderAddress: row.sender_address,
    parsedAt: row.parsed_at,
    transactionDate: row.transaction_date,
    referenceNumber: row.reference_number,
    upiId: row.upi_id,
    isEmi: !!row.is_emi,
    emiId: row.emi_id,
    isSplit: !!row.is_split,
    splitId: row.split_id,
    isLedger: !!row.is_ledger,
    ledgerEntryId: row.ledger_entry_id,
    tags: JSON.parse(row.tags || '[]'),
    note: row.note,
    source: (row.source ?? 'sms') as TransactionSource,
    gmailAccount: row.gmail_account ?? null,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const TransactionRepository = {
  async insert(tx: Transaction): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO transactions
        (id, user_id, amount, type, category_id, category_confidence,
         merchant_type, merchant_name, person_name, bank_name, account_last4,
         available_balance, raw_sms, sms_id, sender_address, parsed_at,
         transaction_date, reference_number, upi_id, is_emi, emi_id,
         is_split, split_id, is_ledger, ledger_entry_id, tags, note,
         source, gmail_account, synced_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tx.id, tx.userId, tx.amount, tx.type, tx.categoryId,
        tx.categoryConfidence, tx.merchantType, tx.merchantName,
        tx.personName, tx.bankName, tx.accountLast4, tx.availableBalance,
        tx.rawSms, tx.smsId, tx.senderAddress, tx.parsedAt,
        tx.transactionDate, tx.referenceNumber, tx.upiId,
        tx.isEmi ? 1 : 0, tx.emiId,
        tx.isSplit ? 1 : 0, tx.splitId,
        tx.isLedger ? 1 : 0, tx.ledgerEntryId,
        JSON.stringify(tx.tags), tx.note, tx.source ?? 'sms',
        tx.gmailAccount ?? null, tx.syncedAt, tx.createdAt, tx.updatedAt,
      ]
    );
  },

  async update(tx: Partial<Transaction> & { id: string }): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.executeSql(
      `UPDATE transactions SET
        amount=COALESCE(?,amount), type=COALESCE(?,type),
        transaction_date=COALESCE(?,transaction_date),
        category_id=?, category_confidence=?, merchant_type=?, merchant_name=?,
        person_name=?, is_emi=?, emi_id=?, is_split=?, split_id=?,
        is_ledger=?, ledger_entry_id=?, tags=?, note=?, synced_at=?, updated_at=?
       WHERE id=?`,
      [
        tx.amount ?? null, tx.type ?? null,
        tx.transactionDate ?? null,
        tx.categoryId ?? null, tx.categoryConfidence ?? 0,
        tx.merchantType ?? 'unknown', tx.merchantName ?? null,
        tx.personName ?? null,
        tx.isEmi ? 1 : 0, tx.emiId ?? null,
        tx.isSplit ? 1 : 0, tx.splitId ?? null,
        tx.isLedger ? 1 : 0, tx.ledgerEntryId ?? null,
        JSON.stringify(tx.tags ?? []), tx.note ?? null,
        tx.syncedAt ?? null, now, tx.id,
      ]
    );
  },

  async assignCategory(
    id: string,
    categoryId: string,
    confidence: number
  ): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE transactions SET category_id=?, category_confidence=?, updated_at=? WHERE id=?`,
      [categoryId, confidence, Date.now(), id]
    );
  },

  async findById(id: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM transactions WHERE id=?', [id]
    );
    return result.rows.length > 0 ? rowToTransaction(result.rows.item(0)) : null;
  },

  async findBySmsId(smsId: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM transactions WHERE sms_id=?', [smsId]
    );
    return result.rows.length > 0 ? rowToTransaction(result.rows.item(0)) : null;
  },

  /**
   * Reassign all transactions not belonging to `correctUserId` to that user.
   * Fixes data stored under an old local userId before Firebase auth was introduced.
   */
  async migrateUserId(correctUserId: string): Promise<number> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE transactions SET user_id = ? WHERE user_id != ?',
      [correctUserId, correctUserId]
    );
    const [countResult] = await db.executeSql(
      'SELECT COUNT(*) as n FROM transactions WHERE user_id = ?',
      [correctUserId]
    );
    return countResult.rows.item(0).n as number;
  },

  async findByUser(
    userId: string,
    options: {
      type?: 'credit' | 'debit';
      categoryId?: string;
      bankName?: string;
      accountLast4?: string | null;
      fromDate?: number;
      toDate?: number;
      uncategorized?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Transaction[]> {
    const db = await getDatabase();
    const conditions: string[] = ['user_id=?'];
    const params: any[] = [userId];

    if (options.type) { conditions.push('type=?'); params.push(options.type); }
    if (options.categoryId) { conditions.push('category_id=?'); params.push(options.categoryId); }
    if (options.bankName) { conditions.push('bank_name=?'); params.push(options.bankName); }
    if (options.accountLast4 !== undefined) {
      if (options.accountLast4 === null) {
        conditions.push('account_last4 IS NULL');
      } else {
        conditions.push('account_last4=?'); params.push(options.accountLast4);
      }
    }
    if (options.fromDate) { conditions.push('transaction_date>=?'); params.push(options.fromDate); }
    if (options.toDate) { conditions.push('transaction_date<=?'); params.push(options.toDate); }
    if (options.uncategorized) { conditions.push('category_id IS NULL'); }

    const limit = options.limit ?? CONSTANTS.DEFAULT_PAGE_SIZE;
    const offset = options.offset ?? 0;
    const where = conditions.join(' AND ');

    const [result] = await db.executeSql(
      `SELECT * FROM transactions WHERE ${where}
       ORDER BY transaction_date DESC, rowid DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const txs: Transaction[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      txs.push(rowToTransaction(result.rows.item(i)));
    }
    return txs;
  },

  async getUnsyncedByUser(userId: string): Promise<Transaction[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM transactions WHERE user_id=? AND synced_at IS NULL ORDER BY updated_at',
      [userId]
    );
    const txs: Transaction[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      txs.push(rowToTransaction(result.rows.item(i)));
    }
    return txs;
  },

  async markSynced(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE transactions SET synced_at=?, updated_at=? WHERE id=?',
      [Date.now(), Date.now(), id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM transactions WHERE id=?', [id]);
  },

  async deleteAll(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM transactions WHERE user_id=?', [userId]);
  },

  async getSummary(
    userId: string,
    fromDate: number,
    toDate: number
  ): Promise<{ totalCredit: number; totalDebit: number; count: number }> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT
         SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as total_credit,
         SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as total_debit,
         COUNT(*) as cnt
       FROM transactions
       WHERE user_id=? AND transaction_date BETWEEN ? AND ?`,
      [userId, fromDate, toDate]
    );
    const row = result.rows.item(0);
    return {
      totalCredit: row.total_credit ?? 0,
      totalDebit: row.total_debit ?? 0,
      count: row.cnt ?? 0,
    };
  },

  async getAccounts(userId: string): Promise<AccountSummary[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT
         bank_name,
         account_last4,
         SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as total_credit,
         SUM(CASE WHEN type='debit'  THEN amount ELSE 0 END) as total_debit,
         COUNT(*) as transaction_count,
         MAX(transaction_date) as last_activity
       FROM transactions
       WHERE user_id=?
       GROUP BY bank_name, account_last4
       ORDER BY last_activity DESC`,
      [userId]
    );
    const accounts: AccountSummary[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      accounts.push({
        bankName: row.bank_name,
        accountLast4: row.account_last4 ?? null,
        totalCredit: row.total_credit ?? 0,
        totalDebit: row.total_debit ?? 0,
        transactionCount: row.transaction_count ?? 0,
        lastActivity: row.last_activity ?? 0,
      });
    }
    return accounts;
  },

  async getCategoryBreakdown(
    userId: string,
    fromDate: number,
    toDate: number
  ): Promise<Array<{ categoryId: string | null; totalDebit: number; totalCredit: number; count: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT category_id,
         SUM(CASE WHEN type='debit'  THEN amount ELSE 0 END) as total_debit,
         SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as total_credit,
         COUNT(*) as cnt
       FROM transactions
       WHERE user_id=? AND transaction_date BETWEEN ? AND ?
       GROUP BY category_id
       ORDER BY total_debit DESC`,
      [userId, fromDate, toDate]
    );
    const rows: Array<{ categoryId: string | null; totalDebit: number; totalCredit: number; count: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        categoryId: row.category_id ?? null,
        totalDebit: row.total_debit ?? 0,
        totalCredit: row.total_credit ?? 0,
        count: row.cnt ?? 0,
      });
    }
    return rows;
  },

  async getTopMerchants(
    userId: string,
    fromDate: number,
    toDate: number,
    limit = 20
  ): Promise<Array<{ merchantName: string; count: number; total: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT merchant_name, COUNT(*) as cnt, SUM(amount) as total
       FROM transactions
       WHERE user_id=? AND type='debit'
         AND merchant_name IS NOT NULL
         AND transaction_date BETWEEN ? AND ?
       GROUP BY merchant_name
       ORDER BY total DESC
       LIMIT ?`,
      [userId, fromDate, toDate, limit]
    );
    const rows: Array<{ merchantName: string; count: number; total: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        merchantName: row.merchant_name as string,
        count: row.cnt ?? 0,
        total: row.total ?? 0,
      });
    }
    return rows;
  },

  async getDayOfWeekPattern(
    userId: string,
    fromDate: number,
    toDate: number
  ): Promise<Array<{ dow: number; total: number; count: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT CAST(strftime('%w', datetime(transaction_date/1000,'unixepoch','localtime')) AS INTEGER) as dow,
         SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as total,
         COUNT(*) as cnt
       FROM transactions
       WHERE user_id=? AND transaction_date BETWEEN ? AND ?
       GROUP BY dow
       ORDER BY dow`,
      [userId, fromDate, toDate]
    );
    const rows: Array<{ dow: number; total: number; count: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        dow: row.dow as number,
        total: row.total ?? 0,
        count: row.cnt ?? 0,
      });
    }
    return rows;
  },

  async getRecurringTransactions(
    userId: string
  ): Promise<Array<{ merchantName: string; monthCount: number; totalCount: number; avgAmount: number; totalAmount: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT merchant_name,
         COUNT(DISTINCT strftime('%Y-%m', datetime(transaction_date/1000,'unixepoch'))) as month_count,
         COUNT(*) as total_count,
         AVG(amount) as avg_amount,
         SUM(amount) as total_amount
       FROM transactions
       WHERE user_id=? AND type='debit' AND merchant_name IS NOT NULL
       GROUP BY merchant_name
       HAVING month_count >= 2
       ORDER BY month_count DESC, total_amount DESC`,
      [userId]
    );
    const rows: Array<{ merchantName: string; monthCount: number; totalCount: number; avgAmount: number; totalAmount: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        merchantName: row.merchant_name as string,
        monthCount: row.month_count ?? 0,
        totalCount: row.total_count ?? 0,
        avgAmount: row.avg_amount ?? 0,
        totalAmount: row.total_amount ?? 0,
      });
    }
    return rows;
  },

  async getCategoryTrend(
    userId: string,
    categoryId: string,
    fromMs: number,
    toMs: number
  ): Promise<Array<{ month: string; total: number; count: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT strftime('%Y-%m', datetime(transaction_date/1000,'unixepoch')) as month,
         SUM(amount) as total,
         COUNT(*) as cnt
       FROM transactions
       WHERE user_id=? AND category_id=?
         AND transaction_date BETWEEN ? AND ?
       GROUP BY month
       ORDER BY month`,
      [userId, categoryId, fromMs, toMs]
    );
    const rows: Array<{ month: string; total: number; count: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        month: row.month as string,
        total: row.total ?? 0,
        count: row.cnt ?? 0,
      });
    }
    return rows;
  },

  async getIncomeBreakdown(
    userId: string,
    fromDate: number,
    toDate: number
  ): Promise<Array<{ categoryId: string | null; total: number; count: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT category_id, SUM(amount) as total, COUNT(*) as cnt
       FROM transactions
       WHERE user_id=? AND type='credit'
         AND transaction_date BETWEEN ? AND ?
       GROUP BY category_id
       ORDER BY total DESC`,
      [userId, fromDate, toDate]
    );
    const rows: Array<{ categoryId: string | null; total: number; count: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        categoryId: row.category_id ?? null,
        total: row.total ?? 0,
        count: row.cnt ?? 0,
      });
    }
    return rows;
  },

  async getLatestBalancePerAccount(
    userId: string
  ): Promise<Array<{ bankName: string; accountLast4: string | null; availableBalance: number; lastDate: number }>> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT bank_name, account_last4, available_balance, MAX(transaction_date) as last_date
       FROM transactions
       WHERE user_id=? AND available_balance IS NOT NULL
       GROUP BY bank_name, account_last4`,
      [userId]
    );
    const rows: Array<{ bankName: string; accountLast4: string | null; availableBalance: number; lastDate: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        bankName: row.bank_name as string,
        accountLast4: row.account_last4 ?? null,
        availableBalance: row.available_balance ?? 0,
        lastDate: row.last_date ?? 0,
      });
    }
    return rows;
  },

  async getMonthlyTrend(
    userId: string,
    fromMs: number,
    toMs: number,
    accountFilter?: { bankName: string; accountLast4: string | null } | null,
  ): Promise<Array<{ month: string; totalCredit: number; totalDebit: number }>> {
    const db = await getDatabase();
    const conditions = ['user_id=?', 'transaction_date>=?', 'transaction_date<=?'];
    const params: any[] = [userId, fromMs, toMs];
    if (accountFilter) {
      conditions.push('bank_name=?');
      params.push(accountFilter.bankName);
      if (accountFilter.accountLast4 === null) {
        conditions.push('account_last4 IS NULL');
      } else {
        conditions.push('account_last4=?');
        params.push(accountFilter.accountLast4);
      }
    }
    const [result] = await db.executeSql(
      `SELECT
         strftime('%Y-%m', datetime(transaction_date/1000, 'unixepoch', 'localtime')) as month,
         SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as total_credit,
         SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as total_debit
       FROM transactions
       WHERE ${conditions.join(' AND ')}
       GROUP BY month
       ORDER BY month ASC`,
      params
    );
    const rows: Array<{ month: string; totalCredit: number; totalDebit: number }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({
        month: row.month as string,
        totalCredit: row.total_credit ?? 0,
        totalDebit: row.total_debit ?? 0,
      });
    }
    return rows;
  },
};
