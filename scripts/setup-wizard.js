import { loadDotEnvLocal } from '../src/lib/env.js';
import { runCommand, checkWritableFolder, checkJsonDb, statusIcon } from '../src/lib/checks.js';

loadDotEnvLocal();

const rows = [
  {
    id: 1,
    name: 'FFmpeg available on PATH',
    test: () => runCommand('ffmpeg -version').ok,
    fix: 'npm run doctor:ffmpeg'
  },
  {
    id: 2,
    name: 'Writable local folders',
    test: () => ['assets/backgrounds', 'tmp', 'outputs'].every((f) => checkWritableFolder(f).ok),
    fix: 'npm run setup:init'
  },
  {
    id: 3,
    name: 'Database initialized',
    test: () => checkJsonDb().ok,
    fix: 'npm run setup:init'
  },
  {
    id: 4,
    name: 'TTS provider or mock mode',
    test: () => Boolean(process.env.TTS_PROVIDER) || process.env.MOCK_MODE === 'true',
    fix: 'Set TTS_PROVIDER=<provider> or MOCK_MODE=true in .env.local'
  },
  {
    id: 5,
    name: 'R2 credentials present',
    test: () => ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'].every((k) => Boolean(process.env[k])),
    fix: 'npm run doctor:r2'
  },
  {
    id: 6,
    name: 'Meta/Instagram credentials present (or dry-run)',
    test: () => (process.env.PUBLISH_MODE || 'dry') === 'dry' || (Boolean(process.env.IG_ACCESS_TOKEN) && Boolean(process.env.IG_IG_USER_ID)),
    fix: 'npm run doctor:ig'
  },
  {
    id: 7,
    name: 'Publish mode = dry or live',
    test: () => ['dry', 'live'].includes(process.env.PUBLISH_MODE || 'dry'),
    fix: 'Set PUBLISH_MODE=dry|live in .env.local'
  },
  {
    id: 8,
    name: 'Kill switch path configured',
    test: () => Boolean(process.env.KILL_SWITCH_PATH),
    fix: 'Set KILL_SWITCH_PATH=./tmp/KILL_SWITCH in .env.local'
  },
  {
    id: 9,
    name: 'Scheduler enabled + timezone set',
    test: () => (process.env.SCHEDULER_ENABLED || '').toLowerCase() === 'true' && Boolean(process.env.TIMEZONE),
    fix: 'Set SCHEDULER_ENABLED=true and TIMEZONE=UTC in .env.local'
  }
];

console.log('Setup Wizard Status\n');
for (const row of rows) {
  const ok = row.test();
  console.log(`${statusIcon(ok, !ok && row.id >= 5)} [${row.id}] ${row.name}`);
  if (!ok) console.log(`    Fix: ${row.fix}`);
}

console.log('\nTest commands:');
console.log('- FFmpeg check: npm run doctor:ffmpeg');
console.log('- R2 upload test: npm run doctor:r2');
console.log('- Instagram token sanity check: npm run doctor:ig');
console.log('- Dry-run publish payload generation: npm run pipeline:dryrun');
console.log('- Live test publish (DANGEROUS): npm run pipeline:test-live');
