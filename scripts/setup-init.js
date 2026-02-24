import fs from 'node:fs';
import path from 'node:path';

const folders = ['assets/backgrounds', 'tmp', 'outputs', 'data', 'logs'];
for (const folder of folders) {
  fs.mkdirSync(path.join(process.cwd(), folder), { recursive: true });
  console.log(`[init] ensured folder: ${folder}`);
}

for (const file of ['.env.example', '.env.local.example']) {
  const target = path.join(process.cwd(), file);
  if (!fs.existsSync(target)) {
    console.error(`[init] missing required template: ${file}`);
    process.exitCode = 1;
  }
}

const envLocal = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envLocal) && fs.existsSync(path.join(process.cwd(), '.env.local.example'))) {
  fs.copyFileSync(path.join(process.cwd(), '.env.local.example'), envLocal);
  console.log('[init] created .env.local from template');
}

const dbPath = path.join(process.cwd(), 'data/app.db.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ jobs: [], settings: {}, clips: [], runs: [] }, null, 2));
  console.log('[init] initialized data/app.db.json');
}
