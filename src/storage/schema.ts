// All monetary values in paise (integer). Never store floats.
// Schema version must be bumped on every structural change.

export const SCHEMA_VERSION = 12;

export const CREATE_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  )`,

  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 1,
    keywords TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit','debit')),
    category_id TEXT REFERENCES categories(id),
    category_confidence REAL NOT NULL DEFAULT 0,
    merchant_type TEXT NOT NULL DEFAULT 'unknown' CHECK(merchant_type IN ('merchant','person','unknown')),
    merchant_name TEXT,
    person_name TEXT,
    bank_name TEXT NOT NULL,
    account_last4 TEXT,
    available_balance INTEGER,
    raw_sms TEXT NOT NULL,
    sms_id TEXT NOT NULL UNIQUE,
    sender_address TEXT NOT NULL,
    parsed_at INTEGER NOT NULL,
    transaction_date INTEGER NOT NULL,
    reference_number TEXT,
    upi_id TEXT,
    is_emi INTEGER NOT NULL DEFAULT 0,
    emi_id TEXT,
    is_split INTEGER NOT NULL DEFAULT 0,
    split_id TEXT,
    is_ledger INTEGER NOT NULL DEFAULT 0,
    ledger_entry_id TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    note TEXT,
    source TEXT NOT NULL DEFAULT 'sms' CHECK(source IN ('sms','aa','email','manual')),
    gmail_account TEXT,
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions(user_id, transaction_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type
    ON transactions(type)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category
    ON transactions(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_bank
    ON transactions(bank_name)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_unsynced
    ON transactions(synced_at) WHERE synced_at IS NULL`,

  `CREATE TABLE IF NOT EXISTS emis (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    lender_name TEXT NOT NULL,
    principal_amount INTEGER NOT NULL,
    emi_amount INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    paid_installments INTEGER NOT NULL DEFAULT 0,
    start_date INTEGER NOT NULL,
    next_due_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    interest_rate REAL,
    loan_account_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','defaulted','paused')),
    transaction_ids TEXT NOT NULL DEFAULT '[]',
    detected_from_sms INTEGER NOT NULL DEFAULT 0,
    detection_confidence REAL NOT NULL DEFAULT 0,
    reminder_days_before INTEGER NOT NULL DEFAULT 3,
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_emis_user_status
    ON emis(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_emis_next_due
    ON emis(next_due_date)`,

  `CREATE TABLE IF NOT EXISTS emi_installments (
    id TEXT PRIMARY KEY,
    emi_id TEXT NOT NULL REFERENCES emis(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    paid INTEGER NOT NULL DEFAULT 0,
    paid_at INTEGER,
    transaction_id TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_emi_installments_emi
    ON emi_installments(emi_id)`,

  `CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('lent','borrowed')),
    person_name TEXT NOT NULL,
    person_phone TEXT,
    person_upi_id TEXT,
    principal_amount INTEGER NOT NULL,
    settled_amount INTEGER NOT NULL DEFAULT 0,
    transaction_id TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','partially_settled','settled')),
    due_date INTEGER,
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_ledger_user_status
    ON ledger_entries(user_id, status)`,

  `CREATE TABLE IF NOT EXISTS ledger_reminders (
    id TEXT PRIMARY KEY,
    ledger_entry_id TEXT NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
    scheduled_at INTEGER NOT NULL,
    fired INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS idx_ledger_reminders_entry
    ON ledger_reminders(ledger_entry_id)`,

  `CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    ledger_entry_id TEXT NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    settled_at INTEGER NOT NULL,
    transaction_id TEXT,
    note TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_settlements_entry
    ON settlements(ledger_entry_id)`,

  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    name TEXT NOT NULL,
    members TEXT NOT NULL DEFAULT '[]',
    total_expenses INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS splits (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by TEXT NOT NULL,
    description TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    split_method TEXT NOT NULL CHECK(split_method IN ('equally','exact','percentage','shares')),
    shares TEXT NOT NULL DEFAULT '[]',
    category_id TEXT,
    transaction_id TEXT,
    date INTEGER NOT NULL,
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_splits_group
    ON splits(group_id)`,

  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('emi','ledger','general')),
    reference_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    fired INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0,
    notifee_id TEXT,
    created_at INTEGER NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_reminders_pending
    ON reminders(scheduled_at) WHERE cancelled = 0 AND fired = 0`,

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

  `CREATE INDEX IF NOT EXISTS idx_budgets_user_month
    ON budgets(user_id, month)`,

  // ── Rent Collection (schema v5) ───────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
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
    note TEXT,
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
    escalation_rate REAL NOT NULL DEFAULT 0,
    deposit_returned INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    documents TEXT NOT NULL DEFAULT '[]',
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
    late_fee INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    payment_date INTEGER,
    payment_mode TEXT CHECK(payment_mode IN ('cash','upi','bank','mapped')),
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','partial','paid','overdue')),
    note TEXT,
    extra_charges TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(tenant_id, month)
  )`,

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
  `CREATE INDEX IF NOT EXISTS idx_maintenance_logs_building
    ON maintenance_logs(building_id)`,
  `CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user
    ON maintenance_logs(user_id)`,

  // ── Tasks (schema v10) ────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','closed')),
    due_date INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    voice_transcript TEXT NOT NULL DEFAULT '',
    source_language TEXT NOT NULL DEFAULT 'en-US'
  )`,

  `CREATE INDEX IF NOT EXISTS idx_tasks_user
    ON tasks(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON tasks(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_created_at
    ON tasks(user_id, created_at DESC)`,

  // ── Habits (schema v12) ───────────────────────────────────────────────────

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

  `CREATE INDEX IF NOT EXISTS idx_habits_user
    ON habits(user_id)`,

  `CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    UNIQUE(habit_id, date)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_habit_logs_habit
    ON habit_logs(habit_id)`,
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
    ON habit_logs(user_id, date)`,

  `CREATE INDEX IF NOT EXISTS idx_buildings_user
    ON buildings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rent_units_building
    ON rent_units(building_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rent_tenants_building
    ON rent_tenants(building_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rent_records_tenant_month
    ON rent_records(tenant_id, month)`,
  `CREATE INDEX IF NOT EXISTS idx_rent_records_user_month
    ON rent_records(user_id, month)`,
];
