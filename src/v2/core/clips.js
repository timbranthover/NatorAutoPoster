import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db.js';

export function ingestClip(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Clip not found: ${abs}`);
  }

  const stat = fs.statSync(abs);
  const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const db = getDb();

  db.prepare(`
    INSERT INTO clips (id, file_path, size_bytes, status, ingested_at)
    VALUES (?, ?, ?, 'available', datetime('now'))
  `).run(id, abs, stat.size);

  return getClip(id);
}

export function getClip(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
}

export function listClips({ status, limit = 50 } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM clips WHERE status = ? ORDER BY ingested_at DESC LIMIT ?').all(status, limit);
  }
  return db.prepare('SELECT * FROM clips ORDER BY ingested_at DESC LIMIT ?').all(limit);
}

export function nextAvailableClip() {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM clips WHERE status = 'available'
    ORDER BY ingested_at ASC LIMIT 1
  `).get();
}

export function markClipUsed(id) {
  const db = getDb();
  db.prepare("UPDATE clips SET status = 'used' WHERE id = ?").run(id);
}
