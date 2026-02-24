import cron from 'node-cron';
import * as config from './config.js';
import { nextPendingJob, createJob } from './jobs.js';
import { nextAvailableClip } from './clips.js';
import { runJob } from './pipeline.js';

let _task = null;

export function startScheduler() {
  if (_task) {
    console.log('Scheduler already running.');
    return;
  }

  const enabled = config.get('scheduler.enabled');
  if (enabled !== 'true') {
    console.log('Scheduler is disabled. Set scheduler.enabled=true to enable.');
    return;
  }

  const cronExpr = config.get('scheduler.cron') || '0 9-11 * * 1-5';
  const tz = config.get('scheduler.timezone') || 'UTC';

  if (!cron.validate(cronExpr)) {
    console.error(`Invalid cron expression: ${cronExpr}`);
    return;
  }

  console.log(`Starting scheduler: "${cronExpr}" (${tz})`);

  _task = cron.schedule(cronExpr, async () => {
    console.log(`[scheduler] Tick at ${new Date().toISOString()}`);
    try {
      let job = nextPendingJob();
      if (!job) {
        const clip = nextAvailableClip();
        if (!clip) {
          console.log('[scheduler] No pending jobs or available clips. Skipping.');
          return;
        }
        job = createJob({ clipId: clip.id });
        console.log(`[scheduler] Created job ${job.id} from clip ${clip.id}`);
      }

      console.log(`[scheduler] Running job ${job.id}...`);
      const result = await runJob(job.id);
      if (result.success) {
        console.log(`[scheduler] Job ${job.id} completed.`);
      } else {
        console.log(`[scheduler] Job ${job.id} failed at ${result.state}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[scheduler] Error: ${err.message}`);
    }
  }, { timezone: tz });

  console.log('Scheduler started. Press Ctrl+C to stop.');
}

export function stopScheduler() {
  if (_task) {
    _task.stop();
    _task = null;
    console.log('Scheduler stopped.');
  }
}
