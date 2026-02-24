#!/usr/bin/env node

// Pipeline engine mode switch
// Dispatches to V1 (script chain) or V2 (state machine) based on PIPELINE_ENGINE env var

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const engine = process.env.PIPELINE_ENGINE || 'alt';
const args = process.argv.slice(2).join(' ');

console.log(`Pipeline engine: ${engine}`);

if (engine === 'v1') {
  console.log('Running V1 pipeline (dry-run)...');
  execSync('node scripts/pipeline-dryrun.js ' + args, { stdio: 'inherit' });
} else if (engine === 'alt') {
  console.log('Running V2 state machine pipeline...');
  execSync('node src/v2/cli/nator.js run ' + args, { stdio: 'inherit' });
} else {
  console.error(`Unknown PIPELINE_ENGINE: ${engine}. Use "v1" or "alt".`);
  process.exit(1);
}
