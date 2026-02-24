import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnvLocal } from '../src/lib/env.js';

loadDotEnvLocal();
const outDir = path.join(process.cwd(), 'outputs');
fs.mkdirSync(outDir, { recursive: true });

const run = {
  id: `dryrun-${Date.now()}`,
  mode: 'dry',
  script: 'Mock script: 3 productivity tips for today.',
  ttsProvider: process.env.TTS_PROVIDER || 'mock',
  storageProvider: process.env.STORAGE_PROVIDER || 'mock',
  publisher: process.env.PUBLISHER_PROVIDER || 'mock',
  createdAt: new Date().toISOString(),
  payload: {
    caption: 'Automated reel (dry-run). #automation #mock',
    mediaUrl: 'mock://local/rendered-video.mp4',
    safety: { duplicateDetection: true, maxPostsPerDay: 3 }
  }
};

const payloadPath = path.join(outDir, `${run.id}.json`);
fs.writeFileSync(payloadPath, JSON.stringify(run, null, 2));

console.log('Dry-run pipeline completed.');
console.log(`Payload written: ${payloadPath}`);
