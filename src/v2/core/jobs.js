import { getDb } from './db.js';
import { STATES, canTransition } from './states.js';

export function createJob({ clipId, caption, scriptText }) {
  const db = getDb();
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO jobs (id, clip_id, state, caption, script_text, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, clipId || null, STATES.PENDING, caption || '', scriptText || null);
  return getJob(id);
}

export function getJob(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
}

export function listJobs({ state, limit = 50 } = {}) {
  const db = getDb();
  if (state) {
    return db.prepare('SELECT * FROM jobs WHERE state = ? ORDER BY created_at DESC LIMIT ?').all(state, limit);
  }
  return db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function nextPendingJob() {
  const db = getDb();
  return db.prepare('SELECT * FROM jobs WHERE state = ? ORDER BY created_at ASC LIMIT 1').get(STATES.PENDING);
}

export function transitionJob(id, toState, updates = {}) {
  const db = getDb();
  const job = getJob(id);
  if (!job) throw new Error(`Job ${id} not found`);

  if (!canTransition(job.state, toState)) {
    throw new Error(`Invalid transition: ${job.state} → ${toState} for job ${id}`);
  }

  const lastGoodState = toState === STATES.FAILED ? job.state : job.last_good_state;
  const retryCount = toState === STATES.FAILED ? job.retry_count + 1 : job.retry_count;

  const setClauses = [
    'state = ?',
    'last_good_state = ?',
    'retry_count = ?',
    "updated_at = datetime('now')",
  ];
  const params = [toState, lastGoodState, retryCount];

  // Apply optional field updates
  const fieldMap = {
    scriptText: 'script_text',
    ttsAudioPath: 'tts_audio_path',
    renderedVideoPath: 'rendered_video_path',
    uploadUrl: 'upload_url',
    igContainerId: 'ig_container_id',
    igMediaId: 'ig_media_id',
    errorMessage: 'error_message',
    caption: 'caption',
  };

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (updates[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = ?`);
      params.push(updates[jsKey]);
    }
  }

  params.push(id);
  db.prepare(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  // Record the transition in runs table
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`;
  db.prepare(`
    INSERT INTO runs (id, job_id, state_from, state_to, provider, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(runId, id, job.state, toState, updates.provider || null, updates.errorMessage || null);

  return getJob(id);
}

export function retryJob(id) {
  const db = getDb();
  const job = getJob(id);
  if (!job) throw new Error(`Job ${id} not found`);
  if (job.state !== STATES.FAILED) throw new Error(`Job ${id} is not failed (state: ${job.state})`);

  // Reset to pending — the pipeline engine will use last_good_state to skip completed steps
  return transitionJob(id, STATES.PENDING, {});
}

export function getJobRuns(jobId) {
  const db = getDb();
  return db.prepare('SELECT * FROM runs WHERE job_id = ? ORDER BY created_at ASC').all(jobId);
}

export function countTodayPosts() {
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM jobs
    WHERE state = ? AND date(updated_at) = date('now')
  `).get(STATES.DONE);
  return row.count;
}
