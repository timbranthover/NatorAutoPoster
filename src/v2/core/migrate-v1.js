import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db.js';
import * as config from './config.js';

const V1_DB_PATH = path.join(process.cwd(), 'data/app.db.json');

export function migrateFromV1() {
  if (!fs.existsSync(V1_DB_PATH)) {
    console.log('No V1 database found at data/app.db.json. Nothing to migrate.');
    return { clips: 0, settings: 0 };
  }

  const v1 = JSON.parse(fs.readFileSync(V1_DB_PATH, 'utf8'));
  const db = getDb();
  let clipCount = 0;
  let settingCount = 0;

  // Migrate clips
  if (v1.clips && Array.isArray(v1.clips)) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO clips (id, file_path, size_bytes, status, ingested_at)
      VALUES (?, ?, ?, 'available', ?)
    `);
    for (const clip of v1.clips) {
      insert.run(clip.id, clip.filePath, clip.sizeBytes || 0, clip.ingestedAt || new Date().toISOString());
      clipCount++;
    }
  }

  // Migrate settings
  if (v1.settings) {
    const settingsMap = {
      publishMode: 'pipeline.publish_mode',
      timezone: 'scheduler.timezone',
      schedulerEnabled: 'scheduler.enabled',
      killSwitchPath: 'pipeline.kill_switch_path',
      maxPostsPerDay: 'pipeline.max_posts_per_day',
      duplicateDetection: 'pipeline.duplicate_detection',
    };

    for (const [v1Key, v2Key] of Object.entries(settingsMap)) {
      if (v1.settings[v1Key] !== undefined) {
        config.set(v2Key, String(v1.settings[v1Key]));
        settingCount++;
      }
    }
  }

  console.log(`Migrated ${clipCount} clips and ${settingCount} settings from V1.`);
  return { clips: clipCount, settings: settingCount };
}
