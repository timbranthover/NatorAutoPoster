#!/usr/bin/env node

import { loadEnvFile, seedDefaults } from '../core/config.js';
import * as config from '../core/config.js';
import { getDb, closeDb } from '../core/db.js';
import { registerAllProviders } from '../providers/index.js';
import { runChecks, formatChecks } from '../core/doctor.js';
import { ingestClip, listClips, nextAvailableClip } from '../core/clips.js';
import { createJob, listJobs, getJob, nextPendingJob, retryJob, getJobRuns } from '../core/jobs.js';
import { runJob } from '../core/pipeline.js';
import { STATES } from '../core/states.js';
import { listAllProviders } from '../core/registry.js';
import { startScheduler } from '../core/scheduler.js';
import { migrateFromV1 } from '../core/migrate-v1.js';

// Bootstrap
loadEnvFile();
getDb();
registerAllProviders();

const [,, command, ...args] = process.argv;

const COMMANDS = {
  setup: cmdSetup,
  doctor: cmdDoctor,
  ingest: cmdIngest,
  run: cmdRun,
  retry: cmdRetry,
  status: cmdStatus,
  jobs: cmdJobs,
  clips: cmdClips,
  config: cmdConfig,
  providers: cmdProviders,
  schedule: cmdSchedule,
  'migrate-v1': cmdMigrateV1,
  help: cmdHelp,
};

async function main() {
  if (!command || command === 'help' || command === '--help') {
    cmdHelp();
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "nator help" for usage.');
    process.exit(1);
  }

  try {
    await handler(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    closeDb();
  }
}

function cmdHelp() {
  console.log(`
nator — NatorAutoPoster V2 CLI

Usage: node src/v2/cli/nator.js <command> [args]

Commands:
  setup              Initialize database and seed default config
  doctor             Run health checks
  ingest <file>      Ingest a clip file
  run [--watch]      Process next queued job (or watch continuously)
  retry <job-id>     Retry a failed job from last good state
  status             Show pipeline status summary
  jobs [state]       List jobs (optionally filter by state)
  clips [status]     List clips (optionally filter by status)
  config [key] [val] Get/set config (no args = show all)
  providers          List registered providers
  schedule           Start cron scheduler
  migrate-v1         Import clips and settings from V1 JSON DB
  help               Show this help
`.trim());
}

function cmdSetup() {
  seedDefaults();
  console.log('Database initialized and defaults seeded.');
  console.log('Run "nator doctor" to check system health.');
}

function cmdDoctor() {
  const checks = runChecks();
  console.log(formatChecks(checks));
  const failed = checks.filter(c => !c.ok && !c.warning).length;
  if (failed > 0) process.exit(1);
}

function cmdIngest(args) {
  if (!args[0]) {
    console.error('Usage: nator ingest <path-to-clip>');
    process.exit(1);
  }
  const clip = ingestClip(args[0]);
  console.log(`Ingested clip: ${clip.id} (${clip.size_bytes} bytes)`);
}

async function cmdRun(args) {
  const watch = args.includes('--watch');

  if (watch) {
    console.log('Watching for jobs... (Ctrl+C to stop)');
    while (true) {
      const job = nextPendingJob();
      if (job) {
        console.log(`Processing job ${job.id}...`);
        const result = await runJob(job.id);
        if (result.success) {
          console.log(`Job ${job.id} completed successfully.`);
        } else {
          console.log(`Job ${job.id} failed at ${result.state}: ${result.error}`);
        }
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Single run: get next pending job or create one from available clip
  let job = nextPendingJob();
  if (!job) {
    const clip = nextAvailableClip();
    if (clip) {
      console.log(`No pending jobs. Creating job from clip ${clip.id}...`);
      job = createJob({ clipId: clip.id });
    } else {
      console.log('No pending jobs and no available clips. Ingest a clip first.');
      console.log('  nator ingest <path-to-clip>');
      return;
    }
  }

  console.log(`Running job ${job.id} (state: ${job.state})...`);
  const result = await runJob(job.id);
  if (result.success) {
    console.log(`Job ${job.id} completed successfully.`);
  } else {
    console.log(`Job ${job.id} failed at state "${result.state}": ${result.error}`);
    console.log(`Retry with: nator retry ${job.id}`);
  }
}

async function cmdRetry(args) {
  if (!args[0]) {
    console.error('Usage: nator retry <job-id>');
    process.exit(1);
  }
  const job = retryJob(args[0]);
  console.log(`Job ${job.id} reset to ${job.state} (will resume from ${job.last_good_state || 'start'}).`);
  const result = await runJob(job.id);
  if (result.success) {
    console.log(`Job ${job.id} completed successfully on retry.`);
  } else {
    console.log(`Job ${job.id} failed again at state "${result.state}": ${result.error}`);
  }
}

function cmdStatus() {
  const allJobs = listJobs({ limit: 1000 });
  const counts = {};
  for (const state of Object.values(STATES)) counts[state] = 0;
  for (const job of allJobs) counts[job.state]++;

  console.log('Pipeline Status:');
  console.log(`  Pending:    ${counts.pending}`);
  console.log(`  Scripting:  ${counts.scripting}`);
  console.log(`  TTS:        ${counts.tts}`);
  console.log(`  Rendering:  ${counts.rendering}`);
  console.log(`  Uploading:  ${counts.uploading}`);
  console.log(`  Publishing: ${counts.publishing}`);
  console.log(`  Done:       ${counts.done}`);
  console.log(`  Failed:     ${counts.failed}`);
  console.log(`  Total:      ${allJobs.length}`);

  const clips = listClips({ limit: 1000 });
  const available = clips.filter(c => c.status === 'available').length;
  console.log(`\nClips: ${clips.length} total, ${available} available`);

  console.log(`\nEngine: ${config.get('pipeline.engine')}`);
  console.log(`Mode:   ${config.get('pipeline.publish_mode')}`);
}

function cmdJobs(args) {
  const state = args[0] || null;
  const jobs = listJobs({ state, limit: 20 });
  if (jobs.length === 0) {
    console.log(state ? `No jobs in state "${state}".` : 'No jobs found.');
    return;
  }
  for (const job of jobs) {
    const age = timeSince(job.created_at);
    console.log(`  ${job.id}  ${job.state.padEnd(12)}  ${age}  ${job.caption?.slice(0, 40) || '(no caption)'}`);
  }
}

function cmdClips(args) {
  const status = args[0] || null;
  const clips = listClips({ status, limit: 20 });
  if (clips.length === 0) {
    console.log(status ? `No clips with status "${status}".` : 'No clips found.');
    return;
  }
  for (const clip of clips) {
    const size = (clip.size_bytes / 1024).toFixed(1) + ' KB';
    console.log(`  ${clip.id}  ${clip.status.padEnd(10)}  ${size}  ${clip.file_path}`);
  }
}

function cmdConfig(args) {
  if (args.length === 0) {
    const all = config.getAll();
    for (const [key, value] of Object.entries(all).sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${key} = ${value}`);
    }
    return;
  }
  if (args.length === 1) {
    const val = config.get(args[0]);
    console.log(val !== null ? val : `(not set: ${args[0]})`);
    return;
  }
  config.set(args[0], args[1]);
  console.log(`Set ${args[0]} = ${args[1]}`);
}

function cmdProviders() {
  const all = listAllProviders();
  for (const [type, names] of Object.entries(all)) {
    const active = config.get(`provider.${type}`) || 'mock';
    console.log(`  ${type}: ${names.map(n => n === active ? `[${n}]` : n).join(', ')}`);
  }
}

function cmdSchedule() {
  startScheduler();
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down scheduler...');
    closeDb();
    process.exit(0);
  });
}

function cmdMigrateV1() {
  const result = migrateFromV1();
  console.log(`Migration complete: ${result.clips} clips, ${result.settings} settings.`);
}

function timeSince(isoStr) {
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return `${Math.round(ms / 86400000)}d ago`;
}

main();
