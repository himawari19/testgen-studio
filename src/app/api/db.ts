import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export async function getDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'urltoscript.db');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode & foreign keys
  await dbInstance.exec('PRAGMA journal_mode=WAL');
  await dbInstance.exec('PRAGMA foreign_keys=ON');

  // Create tables
  await dbInstance.exec(`
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
    );

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
    );

    CREATE TABLE IF NOT EXISTS monitor_snapshots (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      selectors_json TEXT DEFAULT '[]',
      selectors_total INTEGER DEFAULT 0,
      selectors_broken INTEGER DEFAULT 0,
      status TEXT DEFAULT 'healthy',
      checked_at TEXT NOT NULL,
      FOREIGN KEY (monitor_id) REFERENCES monitored_urls(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
    CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_monitor_id ON monitor_snapshots(monitor_id);
  `);

  // Migration: add test_cases_json if missing (existing DBs)
  const cols = await dbInstance.all(`PRAGMA table_info(history)`);
  if (!cols.some((c: any) => c.name === 'test_cases_json')) {
    await dbInstance.exec(`ALTER TABLE history ADD COLUMN test_cases_json TEXT DEFAULT '[]'`);
  }

  return dbInstance;
}
