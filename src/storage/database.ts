import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { CREATE_TABLES, SCHEMA_VERSION } from './schema';
import { DEFAULT_CATEGORIES } from '../config/categories';

SQLite.enablePromise(true);
SQLite.DEBUG(false);

let _db: SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (_db) return _db;
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = await SQLite.openDatabase({ name: 'financeapp.db', location: 'default' });
      await runMigrations(db);
      _db = db;
      return db;
    })();
  }
  return _dbPromise;
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.close();
    _db = null;
    _dbPromise = null;
  }
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Create all tables
  for (const sql of CREATE_TABLES) {
    await db.executeSql(sql);
  }

  // Check current schema version
  const [versionResult] = await db.executeSql(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  const currentVersion = versionResult.rows.length > 0
    ? versionResult.rows.item(0).version
    : 0;

  if (currentVersion < SCHEMA_VERSION) {
    // Fresh install (version 0): tables already created with latest schema,
    // so skip migrations — just stamp the current version.
    if (currentVersion > 0) {
      await applyMigrations(db, currentVersion, SCHEMA_VERSION);
    }
    await db.executeSql(
      'INSERT OR REPLACE INTO schema_version(version) VALUES(?)',
      [SCHEMA_VERSION]
    );
  }

  // Self-heal: ensure documents column exists on rent_tenants regardless of version tracking.
  // Covers the case where migration 6 previously failed silently or the version was already
  // stamped before the migration had a chance to run.
  await ensureColumn(db, 'rent_tenants', 'documents', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'buildings', 'status', "TEXT NOT NULL DEFAULT 'active'");
  await ensureColumn(db, 'rent_units', 'note', 'TEXT');
  await ensureColumn(db, 'rent_tenants', 'escalation_rate', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'rent_tenants', 'deposit_returned', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'rent_records', 'late_fee', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'rent_records', 'extra_charges', "TEXT NOT NULL DEFAULT '[]'");

  // Seed categories if empty
  const [catResult] = await db.executeSql('SELECT COUNT(*) as cnt FROM categories');
  if (catResult.rows.item(0).cnt === 0) {
    await seedCategories(db);
  }
}

async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  try {
    const [info] = await db.executeSql(`PRAGMA table_info(${table})`);
    for (let i = 0; i < info.rows.length; i++) {
      if (info.rows.item(i).name === column) return; // already exists
    }
    await db.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // If the table doesn't exist yet (fresh install), PRAGMA returns empty — ignore
  }
}

async function applyMigrations(
  db: SQLiteDatabase,
  from: number,
  to: number
): Promise<void> {
  // Future migrations keyed by target version
  const migrations: Record<number, string[]> = {
    2: ["ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'sms'"],
    3: [
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        month TEXT NOT NULL,
        category_id TEXT,
        limit_amount INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_id, month, category_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month)`,
    ],
    4: [
      `ALTER TABLE transactions ADD COLUMN gmail_account TEXT`,
    ],
    5: [
      `CREATE TABLE IF NOT EXISTS buildings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rent_units (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        unit_number TEXT NOT NULL,
        monthly_rent INTEGER NOT NULL DEFAULT 0,
        security_deposit INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'vacant' CHECK(status IN ('occupied','vacant')),
        tenant_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rent_tenants (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL REFERENCES rent_units(id),
        building_id TEXT NOT NULL REFERENCES buildings(id),
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        whatsapp_number TEXT,
        lease_start INTEGER NOT NULL,
        lease_end INTEGER,
        monthly_rent INTEGER NOT NULL,
        due_day INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rent_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES rent_tenants(id),
        unit_id TEXT NOT NULL,
        building_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        month TEXT NOT NULL,
        amount_due INTEGER NOT NULL,
        amount_paid INTEGER NOT NULL DEFAULT 0,
        payment_date INTEGER,
        payment_mode TEXT CHECK(payment_mode IN ('cash','upi','bank','mapped')),
        transaction_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial','paid','overdue')),
        note TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(tenant_id, month)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_buildings_user ON buildings(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_units_building ON rent_units(building_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_tenants_building ON rent_tenants(building_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_records_tenant_month ON rent_records(tenant_id, month)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_records_user_month ON rent_records(user_id, month)`,
    ],
    6: [
      `ALTER TABLE rent_tenants ADD COLUMN documents TEXT NOT NULL DEFAULT '[]'`,
    ],
    7: [
      `ALTER TABLE buildings ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
    ],
    8: [
      `ALTER TABLE rent_units ADD COLUMN note TEXT`,
      `ALTER TABLE rent_tenants ADD COLUMN escalation_rate REAL NOT NULL DEFAULT 0`,
      `ALTER TABLE rent_tenants ADD COLUMN deposit_returned INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE rent_records ADD COLUMN late_fee INTEGER NOT NULL DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS maintenance_logs (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        unit_id TEXT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT,
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_maintenance_logs_building ON maintenance_logs(building_id)`,
      `CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user ON maintenance_logs(user_id)`,
    ],
    9: [
      `ALTER TABLE rent_records ADD COLUMN extra_charges TEXT NOT NULL DEFAULT '[]'`,
    ],
    10: [
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        due_date INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        voice_transcript TEXT NOT NULL DEFAULT '',
        source_language TEXT NOT NULL DEFAULT 'en-US'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status)`,
    ],
    11: [
      `ALTER TABLE tasks RENAME TO tasks_v10`,
      `CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending','in_progress','completed','closed')),
        due_date INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        voice_transcript TEXT NOT NULL DEFAULT '',
        source_language TEXT NOT NULL DEFAULT 'en-US'
      )`,
      `INSERT INTO tasks SELECT * FROM tasks_v10`,
      `DROP TABLE tasks_v10`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(user_id, created_at DESC)`,
    ],
    12: [
      `CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#8257E6',
        icon TEXT NOT NULL DEFAULT 'fitness-center',
        reminder_time TEXT,
        created_at INTEGER NOT NULL,
        archived_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id)`,
      `CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        completed_at INTEGER NOT NULL,
        UNIQUE(habit_id, date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id)`,
      `CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date)`,
    ],
  };
  for (let v = from + 1; v <= to; v++) {
    if (migrations[v]) {
      for (const sql of migrations[v]) {
        await db.executeSql(sql);
      }
    }
  }
}

async function seedCategories(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  for (const cat of DEFAULT_CATEGORIES) {
    await db.executeSql(
      `INSERT OR IGNORE INTO categories
        (id, name, icon, color, is_system, keywords, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id, cat.name, cat.icon, cat.color,
        cat.isSystem ? 1 : 0,
        JSON.stringify(cat.keywords),
        now, now,
      ]
    );
  }
}

/** Execute a query inside a transaction. Rolls back on error. */
export async function withTransaction<T>(
  fn: (db: SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  await db.executeSql('BEGIN');
  try {
    const result = await fn(db);
    await db.executeSql('COMMIT');
    return result;
  } catch (err) {
    await db.executeSql('ROLLBACK');
    throw err;
  }
}
