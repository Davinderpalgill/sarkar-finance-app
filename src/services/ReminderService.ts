import { generateId } from '../utils/generateId';
import { scheduleNotification, cancelNotification } from './NotificationService';
import { CONSTANTS } from '../config/constants';
import { EMI } from '../models/EMI';
import { LedgerEntry } from '../models/LedgerEntry';
import { getDatabase } from '../storage/database';
import { formatCurrency } from '../utils/currencyUtils';

// ── EMI Reminders ─────────────────────────────────────────────────────────────

export async function scheduleEmiReminder(emi: EMI): Promise<void> {
  if (!emi.nextDueDate) return;
  const triggerAt = emi.nextDueDate - emi.reminderDaysBefore * 24 * 60 * 60 * 1000;
  if (triggerAt <= Date.now()) return; // already past

  const notifId = await scheduleNotification({
    id: `emi_${emi.id}`,
    title: `EMI Due: ${emi.name}`,
    body: `${formatCurrency(emi.emiAmount)} due in ${emi.reminderDaysBefore} day(s)`,
    channelId: CONSTANTS.NOTIFICATION_CHANNEL_EMI,
    triggerAt,
  });

  const db = await getDatabase();
  await db.executeSql(
    `INSERT OR REPLACE INTO reminders
      (id, user_id, type, reference_id, title, body, scheduled_at, fired, cancelled, notifee_id, created_at)
     VALUES (?,?,?,?,?,?,?,0,0,?,?)`,
    [
      generateId(), emi.userId, 'emi', emi.id,
      `EMI Due: ${emi.name}`,
      `${formatCurrency(emi.emiAmount)} due in ${emi.reminderDaysBefore} day(s)`,
      triggerAt, notifId, Date.now(),
    ]
  );
}

export async function cancelEmiReminder(emiId: string): Promise<void> {
  await cancelNotification(`emi_${emiId}`);
  const db = await getDatabase();
  await db.executeSql(
    "UPDATE reminders SET cancelled=1 WHERE reference_id=? AND type='emi'",
    [emiId]
  );
}

// ── Ledger Reminders ──────────────────────────────────────────────────────────

export async function scheduleForLedger(
  entry: LedgerEntry,
  daysBefore: number = CONSTANTS.DEFAULT_LEDGER_REMINDER_DAYS
): Promise<void> {
  if (!entry.dueDate) return;
  const triggerAt = entry.dueDate - daysBefore * 24 * 60 * 60 * 1000;
  if (triggerAt <= Date.now()) return;

  const action = entry.direction === 'lent' ? 'to collect from' : 'to pay to';
  const notifId = await scheduleNotification({
    id: `ledger_${entry.id}`,
    title: 'Ledger Reminder',
    body: `${formatCurrency(entry.outstandingAmount)} ${action} ${entry.personName}`,
    channelId: CONSTANTS.NOTIFICATION_CHANNEL_LEDGER,
    triggerAt,
  });

  const db = await getDatabase();
  await db.executeSql(
    `INSERT OR REPLACE INTO reminders
      (id, user_id, type, reference_id, title, body, scheduled_at, fired, cancelled, notifee_id, created_at)
     VALUES (?,?,?,?,?,?,?,0,0,?,?)`,
    [
      generateId(), entry.userId, 'ledger', entry.id,
      'Ledger Reminder',
      `${formatCurrency(entry.outstandingAmount)} ${action} ${entry.personName}`,
      triggerAt, notifId, Date.now(),
    ]
  );
}

export async function cancelLedgerReminder(entryId: string): Promise<void> {
  await cancelNotification(`ledger_${entryId}`);
  const db = await getDatabase();
  await db.executeSql(
    "UPDATE reminders SET cancelled=1 WHERE reference_id=? AND type='ledger'",
    [entryId]
  );
}
