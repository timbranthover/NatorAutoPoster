import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as config from './config.js';
import { getDb } from './db.js';

function runCmd(cmd) {
  try {
    const output = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    return { ok: true, output };
  } catch (e) {
    return { ok: false, output: e.stderr?.toString()?.trim() || e.message };
  }
}

function checkFolder(folder) {
  const abs = path.join(process.cwd(), folder);
  try {
    fs.mkdirSync(abs, { recursive: true });
    const marker = path.join(abs, '.write-test');
    fs.writeFileSync(marker, 'ok');
    fs.rmSync(marker);
    return { ok: true, detail: `${folder} writable` };
  } catch (e) {
    return { ok: false, detail: `${folder} not writable: ${e.message}` };
  }
}

export function runChecks() {
  const checks = [];

  // Node.js
  const node = runCmd('node -v');
  checks.push({ id: 'node', name: 'Node.js', ok: node.ok, detail: node.output || 'missing', fix: 'Install Node.js 18+' });

  // FFmpeg
  const ffmpeg = runCmd('ffmpeg -version');
  checks.push({
    id: 'ffmpeg',
    name: 'FFmpeg',
    ok: ffmpeg.ok,
    detail: ffmpeg.ok ? ffmpeg.output.split('\n')[0] : 'not found',
    fix: 'Install ffmpeg and add to PATH',
  });

  // FFprobe
  const ffprobe = runCmd('ffprobe -version');
  checks.push({
    id: 'ffprobe',
    name: 'FFprobe',
    ok: ffprobe.ok,
    detail: ffprobe.ok ? 'available' : 'not found',
    fix: 'Install ffprobe (usually comes with ffmpeg)',
  });

  // Writable folders
  for (const folder of ['tmp', 'outputs', 'data', 'assets/backgrounds']) {
    const result = checkFolder(folder);
    checks.push({ id: `folder:${folder}`, name: `Folder: ${folder}`, ...result, fix: `Create ${folder} directory` });
  }

  // SQLite DB
  try {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as c FROM config').get();
    checks.push({ id: 'database', name: 'SQLite database', ok: true, detail: `${count.c} config keys`, fix: null });
  } catch (e) {
    checks.push({ id: 'database', name: 'SQLite database', ok: false, detail: e.message, fix: 'Run: nator setup' });
  }

  // Provider config
  const publishMode = config.get('pipeline.publish_mode');
  checks.push({
    id: 'publish_mode',
    name: 'Publish mode',
    ok: ['dry', 'live'].includes(publishMode),
    detail: publishMode,
    fix: 'Set PUBLISH_MODE=dry or PUBLISH_MODE=live',
  });

  // Kill switch
  const killPath = config.get('pipeline.kill_switch_path');
  const killActive = killPath && fs.existsSync(killPath);
  checks.push({
    id: 'kill_switch',
    name: 'Kill switch',
    ok: !killActive,
    detail: killActive ? 'ACTIVE — pipeline blocked' : 'inactive',
    fix: killActive ? `Remove ${killPath}` : null,
    warning: killActive,
  });

  // R2 credentials (only warn, not required for mock/tunnel)
  const storageProvider = config.get('provider.storage');
  if (storageProvider === 'r2') {
    const r2Keys = ['r2.account_id', 'r2.access_key_id', 'r2.secret_access_key', 'r2.bucket', 'r2.public_base_url'];
    const missingR2 = r2Keys.filter(k => !config.get(k));
    checks.push({
      id: 'r2_creds',
      name: 'R2 credentials',
      ok: missingR2.length === 0,
      detail: missingR2.length === 0 ? 'all present' : `missing: ${missingR2.join(', ')}`,
      fix: 'Set R2_* env vars in .env.local',
    });
  }

  // IG credentials (only warn in live mode)
  if (publishMode === 'live') {
    const igToken = config.get('ig.access_token');
    const igUser = config.get('ig.user_id');
    checks.push({
      id: 'ig_creds',
      name: 'Instagram credentials',
      ok: Boolean(igToken && igUser),
      detail: igToken && igUser ? 'present' : 'missing IG_ACCESS_TOKEN or IG_IG_USER_ID',
      fix: 'Set IG_ACCESS_TOKEN and IG_IG_USER_ID in .env.local',
    });
  }

  return checks;
}

export function formatChecks(checks) {
  const lines = [];
  let failed = 0;
  for (const check of checks) {
    const icon = check.ok ? '\u2705' : (check.warning ? '\u26A0\uFE0F' : '\u274C');
    lines.push(`${icon} ${check.name}: ${check.detail}`);
    if (!check.ok && check.fix) {
      lines.push(`   Fix: ${check.fix}`);
    }
    if (!check.ok && !check.warning) failed++;
  }
  if (failed > 0) {
    lines.push(`\n${failed} issue(s) found.`);
  } else {
    lines.push('\nAll checks passed.');
  }
  return lines.join('\n');
}
