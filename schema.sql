-- Run this once in your Neon SQL editor to initialize the database
-- Dashboard: console.neon.tech → your project → SQL Editor

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
  monitor_id TEXT NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
  selectors_json TEXT DEFAULT '[]',
  selectors_total INTEGER DEFAULT 0,
  selectors_broken INTEGER DEFAULT 0,
  status TEXT DEFAULT 'healthy',
  checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_monitor_id ON monitor_snapshots(monitor_id);
