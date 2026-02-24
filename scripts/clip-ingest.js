import fs from 'node:fs';
import path from 'node:path';

const clipPath = process.argv[2];
if (!clipPath) {
  console.error('Usage: node scripts/clip-ingest.js <path-to-clip>');
  process.exit(1);
}

const absClip = path.resolve(clipPath);
if (!fs.existsSync(absClip)) {
  console.error(`Clip not found: ${absClip}`);
  process.exit(1);
}

const dbPath = path.join(process.cwd(), 'data/app.db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const stat = fs.statSync(absClip);
const clip = {
  id: `clip-${Date.now()}`,
  filePath: absClip,
  sizeBytes: stat.size,
  ingestedAt: new Date().toISOString()
};

db.clips.push(clip);
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(`Ingested clip ${clip.id}`);
