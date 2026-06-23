import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Neon SQL client — DATABASE_URL must be set in Vercel environment variables
// Format: postgresql://user:password@host/dbname?sslmode=require

let sql: NeonQueryFunction<false, false> | null = null;

function getSQL(): NeonQueryFunction<false, false> {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    sql = neon(url);
  }
  return sql;
}

export async function initDB() {
  const db = getSQL();
  await db`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      user_context TEXT NOT NULL,
      page_title TEXT DEFAULT '',
      elements_found INTEGER DEFAULT 0,
      ai_provider TEXT DEFAULT '',
      ai_model TEXT DEFAULT '',
      test_case_table TEXT DEFAULT '',
      test_cases_json TEXT DEFAULT '[]',
      scripts_json TEXT DEFAULT '[]',
      scripts_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS monitored_urls (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      last_checked TEXT,
      selectors_json TEXT DEFAULT '[]',
      selectors_total INTEGER DEFAULT 0,
      selectors_broken INTEGER DEFAULT 0,
      status TEXT DEFAULT 'healthy',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS monitor_snapshots (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
      selectors_json TEXT DEFAULT '[]',
      selectors_total INTEGER DEFAULT 0,
      selectors_broken INTEGER DEFAULT 0,
      status TEXT DEFAULT 'healthy',
      checked_at TEXT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_history_url ON history(url)`;
  await db`CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_monitor_id ON monitor_snapshots(monitor_id)`;
}

// ponytail: initDB() isn't auto-called (tables created externally), so add a
// cheap idempotent migration that runs once per warm instance to add user_id.
let migrated = false;
export async function ensureSchema() {
  if (migrated) return;
  const db = getSQL();
  await db`ALTER TABLE history ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await db`ALTER TABLE history ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false`;
  await db`ALTER TABLE monitored_urls ADD COLUMN IF NOT EXISTS user_id TEXT`;
  // monitors are per-user: a URL can be watched by many users
  await db`ALTER TABLE monitored_urls DROP CONSTRAINT IF EXISTS monitored_urls_url_key`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS monitored_urls_user_url_key ON monitored_urls(user_id, url)`;
  await db`CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id)`;
  // team workspace tables
  await db`CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`;
  await db`CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    PRIMARY KEY(team_id, user_id)
  )`;
  await db`ALTER TABLE history ADD COLUMN IF NOT EXISTS team_id TEXT`;
  migrated = true;
}

export function getDB() {
  return getSQL();
}
