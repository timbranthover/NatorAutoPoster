import { loadDotEnvLocal } from '../src/lib/env.js';
import { runCommand, checkWritableFolder, checkJsonDb, statusIcon } from '../src/lib/checks.js';

loadDotEnvLocal();

const checks = [];

const nodeCheck = runCommand('node -v');
checks.push({ name: 'Node.js', ok: nodeCheck.ok, detail: nodeCheck.output || 'missing node' });

const npmCheck = runCommand('npm -v');
checks.push({ name: 'npm', ok: npmCheck.ok, detail: npmCheck.output || 'missing npm' });

const ffmpegCheck = runCommand('ffmpeg -version');
checks.push({ name: 'FFmpeg', ok: ffmpegCheck.ok, detail: ffmpegCheck.ok ? ffmpegCheck.output.split('\n')[0] : ffmpegCheck.output });

for (const folder of ['assets/backgrounds', 'tmp', 'outputs']) {
  const result = checkWritableFolder(folder);
  checks.push({ name: `Writable folder: ${folder}`, ok: result.ok, detail: result.message });
}

const db = checkJsonDb();
checks.push({ name: 'Database', ok: db.ok, detail: db.message });

const ttsConfigured = Boolean(process.env.TTS_PROVIDER) || process.env.MOCK_MODE === 'true';
checks.push({ name: 'TTS provider or mock mode', ok: ttsConfigured, detail: ttsConfigured ? 'configured' : 'set TTS_PROVIDER or MOCK_MODE=true' });

const publishMode = process.env.PUBLISH_MODE || 'dry';
checks.push({ name: 'Publish mode', ok: ['dry', 'live'].includes(publishMode), detail: publishMode });

const killSwitch = Boolean(process.env.KILL_SWITCH_PATH);
checks.push({ name: 'Kill switch path', ok: killSwitch, detail: killSwitch ? process.env.KILL_SWITCH_PATH : 'set KILL_SWITCH_PATH' });

const schedulerEnabled = (process.env.SCHEDULER_ENABLED || '').toLowerCase() === 'true';
const scheduler = schedulerEnabled && Boolean(process.env.TIMEZONE);
checks.push({ name: 'Scheduler + timezone', ok: scheduler, detail: scheduler ? `${process.env.SCHEDULER_ENABLED} / ${process.env.TIMEZONE}` : 'set SCHEDULER_ENABLED=true + TIMEZONE' });

let failed = 0;
for (const check of checks) {
  if (!check.ok) failed += 1;
  console.log(`${statusIcon(check.ok)} ${check.name}: ${check.detail}`);
}

if (failed > 0) {
  console.error(`\nDoctor found ${failed} issue(s).`);
  process.exit(1);
}

console.log('\nDoctor checks passed.');
