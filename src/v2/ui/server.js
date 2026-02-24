import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

import { loadEnvFile } from '../core/config.js';
import * as config from '../core/config.js';
import { getDb, closeDb } from '../core/db.js';
import { registerAllProviders } from '../providers/index.js';
import { runChecks } from '../core/doctor.js';
import { ingestClip, listClips, nextAvailableClip } from '../core/clips.js';
import { createJob, listJobs, getJob, nextPendingJob, retryJob, getJobRuns, countTodayPosts } from '../core/jobs.js';
import { runJob } from '../core/pipeline.js';
import { STATES } from '../core/states.js';
import { listAllProviders } from '../core/registry.js';

// Bootstrap
loadEnvFile();
getDb();
registerAllProviders();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File upload (clips)
const upload = multer({
  dest: path.join(process.cwd(), 'tmp', 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// ── API ──────────────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  const allJobs = listJobs({ limit: 1000 });
  const counts = {};
  for (const state of Object.values(STATES)) counts[state] = 0;
  for (const job of allJobs) counts[job.state]++;

  const clips = listClips({ limit: 1000 });
  const todayPosts = countTodayPosts();

  res.json({
    jobs: counts,
    totalJobs: allJobs.length,
    clips: {
      total: clips.length,
      available: clips.filter(c => c.status === 'available').length,
      used: clips.filter(c => c.status === 'used').length,
    },
    todayPosts,
    maxPostsPerDay: parseInt(config.get('pipeline.max_posts_per_day') || '3'),
    publishMode: config.get('pipeline.publish_mode'),
    engine: config.get('pipeline.engine'),
    schedulerEnabled: config.get('scheduler.enabled') === 'true',
  });
});

app.get('/api/jobs', (req, res) => {
  const { state, limit = 50 } = req.query;
  const jobs = listJobs({ state: state || null, limit: parseInt(limit) });
  res.json(jobs);
});

app.get('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const runs = getJobRuns(req.params.id);
  res.json({ ...job, runs });
});

app.post('/api/jobs/:id/retry', async (req, res) => {
  try {
    const job = retryJob(req.params.id);
    const result = await runJob(job.id);
    res.json({ job: getJob(job.id), result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/clips', (req, res) => {
  const { status } = req.query;
  const clips = listClips({ status: status || null, limit: 100 });
  res.json(clips);
});

app.post('/api/clips/ingest', upload.single('clip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Move to assets directory with original name
    const assetsDir = path.join(process.cwd(), 'assets', 'clips');
    fs.mkdirSync(assetsDir, { recursive: true });
    const destPath = path.join(assetsDir, req.file.originalname);
    fs.renameSync(req.file.path, destPath);
    const clip = ingestClip(destPath);
    res.json(clip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/run', async (req, res) => {
  try {
    let job = nextPendingJob();
    const { clipId } = req.body;
    if (!job) {
      const clip = clipId
        ? listClips({ limit: 1000 }).find(c => c.id === clipId)
        : nextAvailableClip();
      if (!clip) return res.status(400).json({ error: 'No pending jobs or available clips' });
      job = createJob({ clipId: clip.id });
    }
    // Run async, return immediately with job id
    res.json({ jobId: job.id, state: job.state });
    runJob(job.id).catch(err => console.error('[dashboard] Run error:', err.message));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json(config.getAll());
});

app.post('/api/config', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  config.set(key, value);
  res.json({ key, value });
});

app.get('/api/providers', (req, res) => {
  const all = listAllProviders();
  const active = {};
  for (const type of Object.keys(all)) {
    active[type] = config.get(`provider.${type}`) || 'mock';
  }
  res.json({ available: all, active });
});

app.get('/api/doctor', (req, res) => {
  const checks = runChecks();
  res.json(checks);
});

// ── Serve index for all non-API routes ──────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`NatorAutoPoster dashboard running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
