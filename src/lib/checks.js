import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export function runCommand(command) {
  try {
    const output = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    return { ok: true, output };
  } catch (error) {
    return { ok: false, output: error.stderr?.toString()?.trim() || error.message };
  }
}

export function checkWritableFolder(folderPath) {
  const absolute = path.join(process.cwd(), folderPath);
  try {
    fs.mkdirSync(absolute, { recursive: true });
    const marker = path.join(absolute, '.write-test');
    fs.writeFileSync(marker, 'ok');
    fs.rmSync(marker);
    return { ok: true, message: `${folderPath} writable` };
  } catch (error) {
    return { ok: false, message: `${folderPath} not writable: ${error.message}` };
  }
}

export function checkJsonDb(dbPath = 'data/app.db.json') {
  const absolute = path.join(process.cwd(), dbPath);
  if (!fs.existsSync(absolute)) return { ok: false, message: `${dbPath} missing` };
  try {
    JSON.parse(fs.readFileSync(absolute, 'utf8'));
    return { ok: true, message: `${dbPath} initialized` };
  } catch (error) {
    return { ok: false, message: `${dbPath} invalid JSON: ${error.message}` };
  }
}

export function statusIcon(ok, warning = false) {
  if (ok) return '🟢';
  if (warning) return '🟡';
  return '🔴';
}
