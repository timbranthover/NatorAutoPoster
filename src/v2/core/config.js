import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db.js';

const DEFAULTS = {
  'pipeline.engine': 'alt',
  'pipeline.publish_mode': 'dry',
  'pipeline.max_posts_per_day': '3',
  'pipeline.duplicate_detection': 'true',
  'pipeline.kill_switch_path': './tmp/KILL_SWITCH',
  'scheduler.enabled': 'false',
  'scheduler.timezone': 'UTC',
  'scheduler.cron': '0 9-11 * * 1-5',
  'provider.tts': 'mock',
  'provider.storage': 'mock',
  'provider.publisher': 'mock',
  'tunnel.enabled': 'true',
  'tunnel.port': '8787',
  'tunnel.timeout_secs': '300',
};

// Env var mapping: DB config key → env var name
const ENV_MAP = {
  'pipeline.engine': 'PIPELINE_ENGINE',
  'pipeline.publish_mode': 'PUBLISH_MODE',
  'pipeline.max_posts_per_day': 'MAX_POSTS_PER_DAY',
  'pipeline.kill_switch_path': 'KILL_SWITCH_PATH',
  'scheduler.enabled': 'SCHEDULER_ENABLED',
  'scheduler.timezone': 'TIMEZONE',
  'provider.tts': 'TTS_PROVIDER',
  'provider.storage': 'STORAGE_PROVIDER',
  'provider.publisher': 'PUBLISHER_PROVIDER',
  'r2.account_id': 'R2_ACCOUNT_ID',
  'r2.access_key_id': 'R2_ACCESS_KEY_ID',
  'r2.secret_access_key': 'R2_SECRET_ACCESS_KEY',
  'r2.bucket': 'R2_BUCKET',
  'r2.public_base_url': 'R2_PUBLIC_BASE_URL',
  'ig.access_token': 'IG_ACCESS_TOKEN',
  'ig.user_id': 'IG_IG_USER_ID',
  'meta.app_id': 'META_APP_ID',
  'meta.app_secret': 'META_APP_SECRET',
};

export function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

export function get(key) {
  // Env var overlay wins over DB config
  const envKey = ENV_MAP[key];
  if (envKey && process.env[envKey]) {
    return process.env[envKey];
  }

  // Then check DB
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  if (row) return row.value;

  // Then defaults
  return DEFAULTS[key] || null;
}

export function set(key, value) {
  const db = getDb();
  db.prepare(`
    INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, String(value));
}

export function getAll() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();
  const result = { ...DEFAULTS };

  // DB values override defaults
  for (const row of rows) {
    result[row.key] = row.value;
  }

  // Env vars override everything
  for (const [configKey, envKey] of Object.entries(ENV_MAP)) {
    if (process.env[envKey]) {
      result[configKey] = process.env[envKey];
    }
  }

  return result;
}

export function seedDefaults() {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)
  `);
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      insert.run(key, value);
    }
  });
  tx();
}
