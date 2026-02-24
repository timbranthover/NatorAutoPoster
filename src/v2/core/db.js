import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nator.db');

let _db = null;

export function getDb() {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  runMigrations(_db);
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS clips (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        size_bytes INTEGER,
        duration_secs REAL,
        status TEXT DEFAULT 'available',
        ingested_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        clip_id TEXT REFERENCES clips(id),
        state TEXT NOT NULL DEFAULT 'pending',
        last_good_state TEXT,
        error_message TEXT,
        script_text TEXT,
        tts_audio_path TEXT,
        rendered_video_path TEXT,
        upload_url TEXT,
        ig_container_id TEXT,
        ig_media_id TEXT,
        caption TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        job_id TEXT REFERENCES jobs(id),
        state_from TEXT,
        state_to TEXT,
        provider TEXT,
        duration_ms INTEGER,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
      CREATE INDEX IF NOT EXISTS idx_jobs_clip ON jobs(clip_id);
      CREATE INDEX IF NOT EXISTS idx_runs_job ON runs(job_id);

      INSERT OR IGNORE INTO schema_version (version) VALUES (1);
    `
  }
];

function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const current = db.prepare('SELECT MAX(version) as v FROM schema_version').get();
  const currentVersion = current?.v || 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec(migration.up);
    }
  }
}
