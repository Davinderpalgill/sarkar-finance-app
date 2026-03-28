import { getDatabase } from '../database';
import { Building } from '../../models/Building';
import { RentUnit } from '../../models/RentUnit';
import { RentTenant, TenantDocument } from '../../models/RentTenant';
import { RentRecord } from '../../models/RentRecord';
import { MaintenanceLog } from '../../models/MaintenanceLog';

function rowToBuilding(row: any): Building {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    address: row.address,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToUnit(row: any): RentUnit {
  return {
    id: row.id,
    buildingId: row.building_id,
    userId: row.user_id,
    unitNumber: row.unit_number,
    monthlyRent: row.monthly_rent,
    securityDeposit: row.security_deposit,
    status: row.status,
    tenantId: row.tenant_id,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTenant(row: any): RentTenant {
  return {
    id: row.id,
    unitId: row.unit_id,
    buildingId: row.building_id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    leaseStart: row.lease_start,
    leaseEnd: row.lease_end,
    monthlyRent: row.monthly_rent,
    dueDay: row.due_day,
    escalationRate: row.escalation_rate ?? 0,
    depositReturned: !!row.deposit_returned,
    status: row.status,
    documents: JSON.parse(row.documents || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRecord(row: any): RentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    unitId: row.unit_id,
    buildingId: row.building_id,
    userId: row.user_id,
    month: row.month,
    amountDue: row.amount_due,
    lateFee: row.late_fee ?? 0,
    extraCharges: JSON.parse(row.extra_charges || '[]'),
    amountPaid: row.amount_paid,
    paymentDate: row.payment_date,
    paymentMode: row.payment_mode,
    transactionId: row.transaction_id,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMaintenanceLog(row: any): MaintenanceLog {
  return {
    id: row.id,
    buildingId: row.building_id,
    unitId: row.unit_id ?? null,
    userId: row.user_id,
    title: row.title,
    amount: row.amount,
    category: row.category,
    description: row.description ?? null,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const RentRepository = {
  // ── Buildings ──────────────────────────────────────────────────────────────

  async getBuildings(userId: string): Promise<Building[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT * FROM buildings WHERE user_id=? AND (status='active' OR status IS NULL) ORDER BY created_at ASC`,
      [userId]
    );
    const items: Building[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToBuilding(result.rows.item(i)));
    }
    return items;
  },

  async getAllBuildings(userId: string): Promise<Building[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM buildings WHERE user_id=? ORDER BY status ASC, created_at ASC',
      [userId]
    );
    const items: Building[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToBuilding(result.rows.item(i)));
    }
    return items;
  },

  async archiveBuilding(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE buildings SET status='archived', updated_at=? WHERE id=?`,
      [Date.now(), id]
    );
    // Mark all active tenants in this building as inactive (they're gone)
    await db.executeSql(
      `UPDATE rent_tenants SET status='inactive', updated_at=? WHERE building_id=?`,
      [Date.now(), id]
    );
    // Mark all units as vacant
    await db.executeSql(
      `UPDATE rent_units SET status='vacant', tenant_id=NULL, updated_at=? WHERE building_id=?`,
      [Date.now(), id]
    );
  },

  async insertBuilding(b: Building): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO buildings (id, user_id, name, address, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)`,
      [b.id, b.userId, b.name, b.address, b.status ?? 'active', b.createdAt, b.updatedAt]
    );
  },

  async updateBuilding(b: Partial<Building> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'UPDATE buildings SET name=?, address=?, updated_at=? WHERE id=?',
      [b.name ?? '', b.address ?? '', Date.now(), b.id]
    );
  },

  async deleteBuilding(id: string): Promise<void> {
    const db = await getDatabase();
    // SQLite foreign key cascades are OFF by default — delete children manually
    await db.executeSql('DELETE FROM rent_records WHERE building_id=?', [id]);
    await db.executeSql('DELETE FROM rent_tenants WHERE building_id=?', [id]);
    await db.executeSql('DELETE FROM rent_units   WHERE building_id=?', [id]);
    await db.executeSql('DELETE FROM buildings    WHERE id=?', [id]);
  },

  // ── Units ──────────────────────────────────────────────────────────────────

  async getUnits(buildingId: string): Promise<RentUnit[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM rent_units WHERE building_id=? ORDER BY unit_number ASC',
      [buildingId]
    );
    const items: RentUnit[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToUnit(result.rows.item(i)));
    }
    return items;
  },

  async getAllUnitsForUser(userId: string): Promise<RentUnit[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM rent_units WHERE user_id=? ORDER BY unit_number ASC',
      [userId]
    );
    const items: RentUnit[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToUnit(result.rows.item(i)));
    }
    return items;
  },

  async insertUnit(u: RentUnit): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO rent_units
        (id, building_id, user_id, unit_number, monthly_rent, security_deposit,
         status, tenant_id, note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        u.id, u.buildingId, u.userId, u.unitNumber,
        u.monthlyRent, u.securityDeposit,
        u.status, u.tenantId, u.note ?? null,
        u.createdAt, u.updatedAt,
      ]
    );
  },

  async updateUnit(u: Partial<RentUnit> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE rent_units SET
        unit_number=?, monthly_rent=?, security_deposit=?,
        status=?, tenant_id=?, note=?, updated_at=?
       WHERE id=?`,
      [
        u.unitNumber ?? '', u.monthlyRent ?? 0, u.securityDeposit ?? 0,
        u.status ?? 'vacant', u.tenantId ?? null, u.note ?? null,
        Date.now(), u.id,
      ]
    );
  },

  async updateUnitNote(unitId: string, note: string | null): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE rent_units SET note=?, updated_at=? WHERE id=?`,
      [note, Date.now(), unitId]
    );
  },

  async deleteUnit(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM rent_records WHERE unit_id=?', [id]);
    await db.executeSql('DELETE FROM rent_tenants WHERE unit_id=?', [id]);
    await db.executeSql('DELETE FROM rent_units   WHERE id=?', [id]);
  },

  // ── Tenants ────────────────────────────────────────────────────────────────

  async getTenants(buildingId: string): Promise<RentTenant[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT * FROM rent_tenants WHERE building_id=? ORDER BY name ASC`,
      [buildingId]
    );
    const items: RentTenant[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToTenant(result.rows.item(i)));
    }
    return items;
  },

  async getAllTenants(userId: string): Promise<RentTenant[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT * FROM rent_tenants WHERE user_id=? ORDER BY name ASC`,
      [userId]
    );
    const items: RentTenant[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToTenant(result.rows.item(i)));
    }
    return items;
  },

  async getActiveTenants(userId: string): Promise<RentTenant[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT * FROM rent_tenants WHERE user_id=? AND status='active' ORDER BY name ASC`,
      [userId]
    );
    const items: RentTenant[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToTenant(result.rows.item(i)));
    }
    return items;
  },

  async getTenantById(id: string): Promise<RentTenant | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM rent_tenants WHERE id=?', [id]
    );
    if (result.rows.length === 0) return null;
    return rowToTenant(result.rows.item(0));
  },

  async insertTenant(t: RentTenant): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO rent_tenants
        (id, unit_id, building_id, user_id, name, phone, whatsapp_number,
         lease_start, lease_end, monthly_rent, due_day, escalation_rate,
         deposit_returned, status, documents, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        t.id, t.unitId, t.buildingId, t.userId,
        t.name, t.phone, t.whatsappNumber,
        t.leaseStart, t.leaseEnd,
        t.monthlyRent, t.dueDay, t.escalationRate ?? 0,
        t.depositReturned ? 1 : 0, t.status,
        JSON.stringify(t.documents ?? []),
        t.createdAt, t.updatedAt,
      ]
    );
    // Mark unit as occupied
    await db.executeSql(
      `UPDATE rent_units SET status='occupied', tenant_id=?, updated_at=? WHERE id=?`,
      [t.id, Date.now(), t.unitId]
    );
  },

  async updateTenant(t: Partial<RentTenant> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE rent_tenants SET
        name=?, phone=?, whatsapp_number=?,
        lease_start=?, lease_end=?,
        monthly_rent=?, due_day=?, escalation_rate=?, status=?, updated_at=?
       WHERE id=?`,
      [
        t.name ?? '', t.phone ?? '', t.whatsappNumber ?? null,
        t.leaseStart ?? Date.now(), t.leaseEnd ?? null,
        t.monthlyRent ?? 0, t.dueDay ?? 5, t.escalationRate ?? 0,
        t.status ?? 'active',
        Date.now(), t.id,
      ]
    );
  },

  async returnDeposit(tenantId: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE rent_tenants SET deposit_returned=1, updated_at=? WHERE id=?`,
      [Date.now(), tenantId]
    );
  },

  async deactivateTenant(tenantId: string): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    // Get the tenant's unit
    const [tenantResult] = await db.executeSql(
      'SELECT unit_id FROM rent_tenants WHERE id=?', [tenantId]
    );
    if (tenantResult.rows.length > 0) {
      const unitId = tenantResult.rows.item(0).unit_id;
      // Check if other active tenants exist for this unit
      const [othersResult] = await db.executeSql(
        `SELECT id FROM rent_tenants WHERE unit_id=? AND id!=? AND status='active' LIMIT 1`,
        [unitId, tenantId]
      );
      if (othersResult.rows.length === 0) {
        // No other active tenants — mark unit vacant
        await db.executeSql(
          `UPDATE rent_units SET status='vacant', tenant_id=NULL, updated_at=? WHERE id=?`,
          [now, unitId]
        );
      } else {
        // Still has active tenants — update tenant_id to one of them
        const remainingId = othersResult.rows.item(0).id;
        await db.executeSql(
          `UPDATE rent_units SET tenant_id=?, updated_at=? WHERE id=?`,
          [remainingId, now, unitId]
        );
      }
    }
    await db.executeSql(
      `UPDATE rent_tenants SET status='inactive', updated_at=? WHERE id=?`,
      [now, tenantId]
    );
  },

  async getUnitTenants(unitId: string): Promise<RentTenant[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT * FROM rent_tenants WHERE unit_id=? ORDER BY status ASC, name ASC`,
      [unitId]
    );
    const items: RentTenant[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToTenant(result.rows.item(i)));
    }
    return items;
  },

  async updateTenantDocuments(tenantId: string, documents: TenantDocument[]): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE rent_tenants SET documents=?, updated_at=? WHERE id=?`,
      [JSON.stringify(documents), Date.now(), tenantId]
    );
  },

  // ── Rent Records ───────────────────────────────────────────────────────────

  async getRentRecords(tenantId: string, month?: string): Promise<RentRecord[]> {
    const db = await getDatabase();
    const sql = month
      ? 'SELECT * FROM rent_records WHERE tenant_id=? AND month=? ORDER BY month DESC'
      : 'SELECT * FROM rent_records WHERE tenant_id=? ORDER BY month DESC';
    const params = month ? [tenantId, month] : [tenantId];
    const [result] = await db.executeSql(sql, params);
    const items: RentRecord[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToRecord(result.rows.item(i)));
    }
    return items;
  },

  async getMonthlyCollection(userId: string, month: string): Promise<RentRecord[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT rr.* FROM rent_records rr
       JOIN rent_tenants rt ON rr.tenant_id = rt.id
       JOIN buildings b ON rr.building_id = b.id
       WHERE rr.user_id=? AND rr.month=? AND rt.status='active' AND b.status='active'
       ORDER BY rt.name ASC`,
      [userId, month]
    );
    const items: RentRecord[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToRecord(result.rows.item(i)));
    }
    return items;
  },

  async getHistoryMonthlyCollection(userId: string, month: string): Promise<RentRecord[]> {
    const db = await getDatabase();
    // History = inactive tenants OR active tenants in archived buildings
    const [result] = await db.executeSql(
      `SELECT rr.* FROM rent_records rr
       JOIN rent_tenants rt ON rr.tenant_id = rt.id
       JOIN buildings b ON rr.building_id = b.id
       WHERE rr.user_id=? AND rr.month=? AND (rt.status='inactive' OR b.status='archived')
       ORDER BY b.name ASC, rt.name ASC`,
      [userId, month]
    );
    const items: RentRecord[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToRecord(result.rows.item(i)));
    }
    return items;
  },

  async insertRentRecord(r: RentRecord): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO rent_records
        (id, tenant_id, unit_id, building_id, user_id, month,
         amount_due, late_fee, extra_charges, amount_paid, payment_date, payment_mode,
         transaction_id, status, note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        r.id, r.tenantId, r.unitId, r.buildingId, r.userId, r.month,
        r.amountDue, r.lateFee ?? 0, JSON.stringify(r.extraCharges ?? []),
        r.amountPaid, r.paymentDate, r.paymentMode,
        r.transactionId, r.status, r.note,
        r.createdAt, r.updatedAt,
      ]
    );
  },

  async updateRentRecord(r: Partial<RentRecord> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE rent_records SET
        amount_paid=?, late_fee=?, extra_charges=?, payment_date=?, payment_mode=?,
        transaction_id=?, status=?, note=?, updated_at=?
       WHERE id=?`,
      [
        r.amountPaid ?? 0, r.lateFee ?? 0, JSON.stringify(r.extraCharges ?? []),
        r.paymentDate ?? null, r.paymentMode ?? null,
        r.transactionId ?? null, r.status ?? 'pending',
        r.note ?? null, Date.now(), r.id,
      ]
    );
  },

  async ensureMonthlyRecords(userId: string, month: string): Promise<void> {
    const db = await getDatabase();
    // Get all active tenants in active buildings for this user
    const [tenantResult] = await db.executeSql(
      `SELECT rt.* FROM rent_tenants rt
       JOIN buildings b ON rt.building_id = b.id
       WHERE rt.user_id=? AND rt.status='active' AND b.status='active'`,
      [userId]
    );

    // Clean up any unpaid records created for months before the tenant's lease start
    for (let i = 0; i < tenantResult.rows.length; i++) {
      const t = tenantResult.rows.item(i);
      const leaseStartMonth = new Date(t.lease_start).toISOString().slice(0, 7);
      await db.executeSql(
        `DELETE FROM rent_records
         WHERE tenant_id=? AND month < ? AND amount_paid=0 AND status IN ('pending','overdue')`,
        [t.id, leaseStartMonth]
      );
    }
    const now = Date.now();
    const currentDay = new Date().getDate();
    const [, monthStr] = month.split('-');
    const monthNum = parseInt(monthStr, 10);
    const currentMonth = new Date().toISOString().slice(0, 7);

    for (let i = 0; i < tenantResult.rows.length; i++) {
      const t = tenantResult.rows.item(i);

      // Skip months before the tenant's lease start
      const leaseStartMonth = new Date(t.lease_start).toISOString().slice(0, 7);
      if (leaseStartMonth > month) continue;

      // Check if record already exists
      const [existing] = await db.executeSql(
        'SELECT id, status FROM rent_records WHERE tenant_id=? AND month=?',
        [t.id, month]
      );
      if (existing.rows.length === 0) {
        const id = `rr-${t.id}-${month}`;
        // Determine initial status — never overdue before lease actually started
        let status = 'pending';
        if (month < currentMonth && month >= leaseStartMonth) {
          status = 'overdue';
        } else if (month === currentMonth && currentDay > t.due_day && Date.now() >= t.lease_start) {
          status = 'overdue';
        }
        await db.executeSql(
          `INSERT OR IGNORE INTO rent_records
            (id, tenant_id, unit_id, building_id, user_id, month,
             amount_due, amount_paid, payment_date, payment_mode,
             transaction_id, status, note, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,0,NULL,NULL,NULL,?,NULL,?,?)`,
          [
            id, t.id, t.unit_id, t.building_id, userId, month,
            t.monthly_rent, status, now, now,
          ]
        );
      } else {
        // Update overdue status if still pending and past due — respect lease start
        const rec = existing.rows.item(0);
        if (rec.status === 'pending') {
          const isPastDue =
            (month < currentMonth && month >= leaseStartMonth) ||
            (month === currentMonth && currentDay > t.due_day && Date.now() >= t.lease_start);
          if (isPastDue) {
            await db.executeSql(
              `UPDATE rent_records SET status='overdue', updated_at=? WHERE id=?`,
              [now, rec.id]
            );
          }
        }
      }
    }
  },

  async getSuggestedTransactions(
    userId: string,
    amountDue: number,
    month: string
  ): Promise<any[]> {
    const db = await getDatabase();
    const low  = Math.floor(amountDue * 0.9);
    const high = Math.ceil(amountDue * 1.1);
    const startDate = new Date(`${month}-01`).getTime();
    const endDate   = new Date(`${month}-01`);
    endDate.setMonth(endDate.getMonth() + 1);
    const endTs = endDate.getTime();

    const [result] = await db.executeSql(
      `SELECT * FROM transactions
       WHERE type='credit'
         AND amount BETWEEN ? AND ?
         AND transaction_date BETWEEN ? AND ?
         AND user_id=?
       ORDER BY transaction_date DESC`,
      [low, high, startDate, endTs, userId]
    );
    const items: any[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }
    return items;
  },

  async getRecordById(id: string): Promise<RentRecord | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM rent_records WHERE id=?', [id]
    );
    if (result.rows.length === 0) return null;
    return rowToRecord(result.rows.item(0));
  },

  async getActiveTenantCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT COUNT(*) as cnt FROM rent_tenants WHERE user_id=? AND status='active'`,
      [userId]
    );
    return result.rows.item(0).cnt;
  },

  // ── Maintenance Logs ───────────────────────────────────────────────────────

  async getMaintenanceLogs(buildingId: string): Promise<MaintenanceLog[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT * FROM maintenance_logs WHERE building_id=? ORDER BY date DESC`,
      [buildingId]
    );
    const items: MaintenanceLog[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToMaintenanceLog(result.rows.item(i)));
    }
    return items;
  },

  async insertMaintenanceLog(log: MaintenanceLog): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT INTO maintenance_logs
        (id, building_id, unit_id, user_id, title, amount, category, description, date, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        log.id, log.buildingId, log.unitId, log.userId,
        log.title, log.amount, log.category, log.description,
        log.date, log.createdAt, log.updatedAt,
      ]
    );
  },

  async updateMaintenanceLog(log: Partial<MaintenanceLog> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE maintenance_logs SET title=?, amount=?, category=?, description=?, date=?, updated_at=? WHERE id=?`,
      [log.title ?? '', log.amount ?? 0, log.category ?? 'general', log.description ?? null, log.date ?? Date.now(), Date.now(), log.id]
    );
  },

  async deleteMaintenanceLog(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(`DELETE FROM maintenance_logs WHERE id=?`, [id]);
  },

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnnualSummary(userId: string, year: string): Promise<{ month: string; collected: number; due: number }[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT month,
              SUM(amount_paid) as collected,
              SUM(amount_due + COALESCE(late_fee,0)) as due
       FROM rent_records
       WHERE user_id=? AND month LIKE ?
       GROUP BY month
       ORDER BY month ASC`,
      [userId, `${year}-%`]
    );
    const items: { month: string; collected: number; due: number }[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      items.push({ month: row.month, collected: row.collected, due: row.due });
    }
    return items;
  },

  async getExpiringLeases(userId: string, withinDays: number = 30): Promise<RentTenant[]> {
    const db = await getDatabase();
    const now = Date.now();
    const future = now + withinDays * 24 * 60 * 60 * 1000;
    const [result] = await db.executeSql(
      `SELECT * FROM rent_tenants
       WHERE user_id=? AND status='active' AND lease_end IS NOT NULL
         AND lease_end BETWEEN ? AND ?
       ORDER BY lease_end ASC`,
      [userId, now, future]
    );
    const items: RentTenant[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(rowToTenant(result.rows.item(i)));
    }
    return items;
  },

  async getMultiMonthOverdue(userId: string): Promise<{ tenant: RentTenant; overdueMonths: string[] }[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT rr.tenant_id, GROUP_CONCAT(rr.month) as months, COUNT(*) as cnt
       FROM rent_records rr
       JOIN rent_tenants rt ON rr.tenant_id = rt.id
       WHERE rr.user_id=? AND rr.status='overdue' AND rt.status='active'
       GROUP BY rr.tenant_id
       HAVING cnt >= 2
       ORDER BY cnt DESC`,
      [userId]
    );
    const items: { tenant: RentTenant; overdueMonths: string[] }[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      const tenant = await RentRepository.getTenantById(row.tenant_id);
      if (tenant) {
        items.push({
          tenant,
          overdueMonths: (row.months as string).split(',').sort(),
        });
      }
    }
    return items;
  },

  async getOccupancyStats(userId: string): Promise<{ total: number; occupied: number; vacant: number }> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN ru.status='occupied' THEN 1 ELSE 0 END) as occupied,
         SUM(CASE WHEN ru.status='vacant' THEN 1 ELSE 0 END) as vacant
       FROM rent_units ru
       JOIN buildings b ON ru.building_id = b.id
       WHERE ru.user_id=? AND b.status='active'`,
      [userId]
    );
    const row = result.rows.item(0);
    return {
      total: row.total ?? 0,
      occupied: row.occupied ?? 0,
      vacant: row.vacant ?? 0,
    };
  },

  // Removes rent records/tenants/units whose parent building no longer exists.
  // Needed because SQLite foreign-key cascades are OFF by default.
  async purgeOrphanedRentData(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `DELETE FROM rent_records WHERE user_id=? AND building_id NOT IN (SELECT id FROM buildings)`,
      [userId]
    );
    await db.executeSql(
      `DELETE FROM rent_tenants WHERE user_id=? AND building_id NOT IN (SELECT id FROM buildings)`,
      [userId]
    );
    await db.executeSql(
      `DELETE FROM rent_units WHERE user_id=? AND building_id NOT IN (SELECT id FROM buildings)`,
      [userId]
    );
  },
};
