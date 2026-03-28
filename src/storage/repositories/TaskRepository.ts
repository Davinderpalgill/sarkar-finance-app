import { getDatabase } from '../database';
import { Task } from '../../models/Task';
import {
  subDays, subWeeks, subMonths, subYears,
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  format,
} from 'date-fns';

function rowToTask(row: any): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    voiceTranscript: row.voice_transcript,
    sourceLanguage: row.source_language,
  };
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  closed: number;
  overdue: number;
  priorityHigh: number;
  priorityMedium: number;
  priorityLow: number;
  periodBuckets: Array<{ label: string; count: number }>;
}

export const TaskRepository = {
  async insert(task: Task): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `INSERT OR IGNORE INTO tasks
        (id, user_id, title, description, priority, status,
         due_date, completed_at, created_at, voice_transcript, source_language)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        task.id, task.userId, task.title, task.description,
        task.priority, task.status,
        task.dueDate ?? null, task.completedAt ?? null,
        task.createdAt, task.voiceTranscript, task.sourceLanguage,
      ]
    );
  },

  async update(task: Partial<Task> & { id: string }): Promise<void> {
    const db = await getDatabase();
    await db.executeSql(
      `UPDATE tasks SET
        title=?, description=?, priority=?, status=?,
        due_date=?, completed_at=?
       WHERE id=?`,
      [
        task.title ?? '', task.description ?? '',
        task.priority ?? 'medium', task.status ?? 'pending',
        task.dueDate ?? null, task.completedAt ?? null,
        task.id,
      ]
    );
  },

  async findById(id: string): Promise<Task | null> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM tasks WHERE id=?', [id]);
    return result.rows.length > 0 ? rowToTask(result.rows.item(0)) : null;
  },

  async findByUser(
    userId: string,
    status?: Task['status']
  ): Promise<Task[]> {
    const db = await getDatabase();
    const sql = status
      ? 'SELECT * FROM tasks WHERE user_id=? AND status=? ORDER BY created_at DESC'
      : 'SELECT * FROM tasks WHERE user_id=? ORDER BY created_at DESC';
    const params = status ? [userId, status] : [userId];
    const [result] = await db.executeSql(sql, params);
    const tasks: Task[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      tasks.push(rowToTask(result.rows.item(i)));
    }
    return tasks;
  },

  async findByUserInRange(
    userId: string,
    fromMs: number,
    toMs: number,
    status?: Task['status']
  ): Promise<Task[]> {
    const db = await getDatabase();
    const sql = status
      ? 'SELECT * FROM tasks WHERE user_id=? AND created_at >= ? AND created_at <= ? AND status=? ORDER BY created_at DESC'
      : 'SELECT * FROM tasks WHERE user_id=? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC';
    const params = status ? [userId, fromMs, toMs, status] : [userId, fromMs, toMs];
    const [result] = await db.executeSql(sql, params);
    const tasks: Task[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      tasks.push(rowToTask(result.rows.item(i)));
    }
    return tasks;
  },

  async getStats(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Promise<TaskStats> {
    const db = await getDatabase();
    const now = Date.now();

    // KPI query
    const [kpiResult] = await db.executeSql(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='pending' OR status='in_progress' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN due_date IS NOT NULL AND due_date < ? AND status NOT IN ('completed','closed') THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN priority='high' THEN 1 ELSE 0 END) as priority_high,
        SUM(CASE WHEN priority='medium' THEN 1 ELSE 0 END) as priority_medium,
        SUM(CASE WHEN priority='low' THEN 1 ELSE 0 END) as priority_low
       FROM tasks WHERE user_id=?`,
      [now, userId]
    );
    const kpi = kpiResult.rows.item(0);

    // Build bucket map
    const bucketMap = new Map<string, { label: string; count: number }>();
    let rangeStart: Date;

    if (period === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = startOfDay(subDays(new Date(), i));
        const key = format(d, 'yyyy-MM-dd');
        bucketMap.set(key, { label: format(d, 'EEE'), count: 0 });
      }
      rangeStart = startOfDay(subDays(new Date(), 6));
    } else if (period === 'weekly') {
      for (let i = 7; i >= 0; i--) {
        const d = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const key = format(d, 'yyyy-II');
        bucketMap.set(key, { label: format(d, 'MMM d'), count: 0 });
      }
      rangeStart = startOfWeek(subWeeks(new Date(), 7), { weekStartsOn: 1 });
    } else if (period === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const d = startOfMonth(subMonths(new Date(), i));
        const key = format(d, 'yyyy-MM');
        bucketMap.set(key, { label: format(d, 'MMM'), count: 0 });
      }
      rangeStart = startOfMonth(subMonths(new Date(), 11));
    } else {
      for (let i = 2; i >= 0; i--) {
        const d = startOfYear(subYears(new Date(), i));
        const key = format(d, 'yyyy');
        bucketMap.set(key, { label: format(d, 'yyyy'), count: 0 });
      }
      rangeStart = startOfYear(subYears(new Date(), 2));
    }

    // Fetch raw created_at values in range
    const [rawResult] = await db.executeSql(
      'SELECT created_at FROM tasks WHERE user_id=? AND created_at >= ?',
      [userId, rangeStart.getTime()]
    );

    for (let i = 0; i < rawResult.rows.length; i++) {
      const ts: number = rawResult.rows.item(i).created_at;
      const d = new Date(ts);
      let key: string;
      if (period === 'daily') {
        key = format(startOfDay(d), 'yyyy-MM-dd');
      } else if (period === 'weekly') {
        key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-II');
      } else if (period === 'monthly') {
        key = format(startOfMonth(d), 'yyyy-MM');
      } else {
        key = format(startOfYear(d), 'yyyy');
      }
      const bucket = bucketMap.get(key);
      if (bucket) bucket.count++;
    }

    return {
      total: kpi.total ?? 0,
      pending: kpi.pending ?? 0,
      completed: kpi.completed ?? 0,
      closed: kpi.closed ?? 0,
      overdue: kpi.overdue ?? 0,
      priorityHigh: kpi.priority_high ?? 0,
      priorityMedium: kpi.priority_medium ?? 0,
      priorityLow: kpi.priority_low ?? 0,
      periodBuckets: Array.from(bucketMap.values()),
    };
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM tasks WHERE id=?', [id]);
  },
};
