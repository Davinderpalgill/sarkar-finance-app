import { getDatabase } from '../database';
import { Habit, HabitLog } from '../../models/Habit';
import { generateId } from '../../utils/generateId';
import { format, subDays } from 'date-fns';

function rowToHabit(row: any): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    color: row.color,
    icon: row.icon,
    reminderTime: row.reminder_time ?? null,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  };
}

function rowToLog(row: any): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    date: row.date,
    completedAt: row.completed_at,
  };
}

export const HabitRepository = {
  async insert(habit: Habit): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO habits
        (id, user_id, title, description, color, icon, reminder_time, created_at, archived_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        habit.id, habit.userId, habit.title, habit.description,
        habit.color, habit.icon, habit.reminderTime ?? null,
        habit.createdAt, habit.archivedAt ?? null,
      ]
    );
  },

  async update(habit: Partial<Habit> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE habits SET
        title=?, description=?, color=?, icon=?, reminder_time=?, archived_at=?
       WHERE id=?`,
      [
        habit.title ?? '', habit.description ?? '',
        habit.color ?? '#8257E6', habit.icon ?? 'fitness-center',
        habit.reminderTime ?? null, habit.archivedAt ?? null,
        habit.id,
      ]
    );
  },

  async findByUser(userId: string): Promise<Habit[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM habits WHERE user_id=? AND archived_at IS NULL ORDER BY created_at DESC',
      [userId]
    );
    const habits: Habit[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      habits.push(rowToHabit(result.rows.item(i)));
    }
    return habits;
  },

  async findById(id: string): Promise<Habit | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM habits WHERE id=?', [id]);
    return result.rows.length > 0 ? rowToHabit(result.rows.item(0)) : null;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM habits WHERE id=?', [id]);
  },

  // ── Logs ──────────────────────────────────────────────────────────────────

  async logCompletion(habitId: string, userId: string, date: string): Promise<HabitLog> {
    const db = await getDatabase();
    const log: HabitLog = {
      id: generateId(),
      habitId,
      userId,
      date,
      completedAt: Date.now(),
    };
    await db.executeSql(
      `INSERT OR REPLACE INTO habit_logs (id, habit_id, user_id, date, completed_at)
       VALUES (?,?,?,?,?)`,
      [log.id, log.habitId, log.userId, log.date, log.completedAt]
    );
    return log;
  },

  async removeLog(habitId: string, date: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      'DELETE FROM habit_logs WHERE habit_id=? AND date=?',
      [habitId, date]
    );
  },

  async getLogsForDate(userId: string, date: string): Promise<HabitLog[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM habit_logs WHERE user_id=? AND date=?',
      [userId, date]
    );
    const logs: HabitLog[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      logs.push(rowToLog(result.rows.item(i)));
    }
    return logs;
  },

  async getLogsForHabit(habitId: string): Promise<HabitLog[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM habit_logs WHERE habit_id=? ORDER BY date DESC',
      [habitId]
    );
    const logs: HabitLog[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      logs.push(rowToLog(result.rows.item(i)));
    }
    return logs;
  },

  async getStreak(habitId: string): Promise<{ current: number; best: number; total: number }> {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT date FROM habit_logs WHERE habit_id=? ORDER BY date DESC',
      [habitId]
    );
    const dates: string[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      dates.push(result.rows.item(i).date);
    }

    const total = dates.length;
    if (total === 0) return { current: 0, best: 0, total: 0 };

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Current streak — allow today or yesterday as starting point
    let current = 0;
    let checkDate = dates[0] === today || dates[0] === yesterday ? dates[0] : null;
    if (checkDate) {
      for (const date of dates) {
        if (date === checkDate) {
          current++;
          checkDate = format(subDays(new Date(checkDate), 1), 'yyyy-MM-dd');
        } else {
          break;
        }
      }
    }

    // Best streak — longest consecutive run
    let best = 0;
    let run = 1;
    const asc = [...dates].reverse();
    for (let i = 1; i < asc.length; i++) {
      const prev = new Date(asc[i - 1]);
      const curr = new Date(asc[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        run++;
      } else {
        best = Math.max(best, run);
        run = 1;
      }
    }
    best = Math.max(best, run);

    return { current, best, total };
  },
};
