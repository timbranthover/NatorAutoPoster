import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data/app.db.json');

export function enqueueJob(type, payload) {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  db.jobs.push({ id: `job-${Date.now()}`, type, payload, status: 'queued', createdAt: new Date().toISOString() });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function listQueuedJobs() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  return db.jobs.filter((job) => job.status === 'queued');
}
