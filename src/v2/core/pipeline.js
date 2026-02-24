import fs from 'node:fs';
import path from 'node:path';
import { resolve } from './registry.js';
import { STATES, PIPELINE_ORDER, nextState, resumeState } from './states.js';
import { getJob, transitionJob, countTodayPosts } from './jobs.js';
import { getClip } from './clips.js';
import * as config from './config.js';

const TMP_DIR = path.join(process.cwd(), 'tmp');
const OUTPUTS_DIR = path.join(process.cwd(), 'outputs');

export async function runJob(jobId) {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  // Safety checks
  const killPath = config.get('pipeline.kill_switch_path');
  if (killPath && fs.existsSync(killPath)) {
    throw new Error('Kill switch is active. Remove ' + killPath + ' to continue.');
  }

  const maxPosts = parseInt(config.get('pipeline.max_posts_per_day') || '3', 10);
  const todayCount = countTodayPosts();
  if (todayCount >= maxPosts) {
    throw new Error(`Daily post limit reached (${todayCount}/${maxPosts}). Try again tomorrow.`);
  }

  // Determine starting state
  let startIdx = 0;
  if (job.state === STATES.FAILED && job.last_good_state) {
    const resume = resumeState(job);
    if (resume) {
      startIdx = PIPELINE_ORDER.indexOf(resume);
      // Reset to the resume state
      transitionJob(jobId, resume);
    }
  } else if (job.state === STATES.PENDING) {
    startIdx = 0;
  } else {
    throw new Error(`Job ${jobId} is in state ${job.state}, cannot run.`);
  }

  const context = {
    jobId,
    clipPath: job.clip_id ? getClip(job.clip_id)?.file_path : null,
    scriptText: job.script_text,
    ttsAudioPath: job.tts_audio_path,
    renderedVideoPath: job.rendered_video_path,
    uploadUrl: job.upload_url,
    caption: job.caption,
  };

  // Walk through pipeline states
  for (let i = startIdx; i < PIPELINE_ORDER.length; i++) {
    const state = PIPELINE_ORDER[i];
    const startTime = Date.now();

    try {
      // Transition into this processing state
      transitionJob(jobId, state);

      // Execute the step
      const result = await executeStep(state, context);

      // Merge result into context
      Object.assign(context, result.context || {});

      // Persist step outputs — if last step, transition to DONE
      const updates = { ...result.updates, provider: result.provider };
      if (i === PIPELINE_ORDER.length - 1) {
        transitionJob(jobId, STATES.DONE, updates);
      } else {
        // Store updates on the job without changing state yet
        // (next iteration will transition to the next processing state)
        const db = (await import('./db.js')).getDb();
        const fieldMap = {
          scriptText: 'script_text',
          ttsAudioPath: 'tts_audio_path',
          renderedVideoPath: 'rendered_video_path',
          uploadUrl: 'upload_url',
          igContainerId: 'ig_container_id',
          igMediaId: 'ig_media_id',
          caption: 'caption',
        };
        const setClauses = ["updated_at = datetime('now')"];
        const params = [];
        for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
          if (updates[jsKey] !== undefined) {
            setClauses.push(`${dbCol} = ?`);
            params.push(updates[jsKey]);
          }
        }
        if (params.length > 0) {
          params.push(jobId);
          db.prepare(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
        }
      }

    } catch (err) {
      transitionJob(jobId, STATES.FAILED, {
        errorMessage: err.message,
        provider: state,
      });
      return { success: false, state, error: err.message, duration: Date.now() - startTime };
    }
  }

  return { success: true, jobId };
}

async function executeStep(state, ctx) {
  switch (state) {
    case STATES.SCRIPTING:
      return executeScripting(ctx);
    case STATES.TTS:
      return executeTts(ctx);
    case STATES.RENDERING:
      return executeRendering(ctx);
    case STATES.UPLOADING:
      return executeUploading(ctx);
    case STATES.PUBLISHING:
      return executePublishing(ctx);
    default:
      throw new Error(`Unknown pipeline state: ${state}`);
  }
}

async function executeScripting(ctx) {
  // If script was pre-provided (entered in dashboard), skip the script provider entirely
  if (ctx.scriptText) {
    const caption = ctx.scriptText.slice(0, 100).replace(/\s+/g, ' ').trim();
    return {
      provider: 'manual',
      context: { scriptText: ctx.scriptText, caption },
      updates: { scriptText: ctx.scriptText, caption },
    };
  }

  const provider = resolve('script');
  const result = await provider.generate(ctx.clipPath);
  const caption = result.text.slice(0, 100) + ' ' + (result.hashtags || []).join(' ');
  return {
    provider: 'script',
    context: { scriptText: result.text, caption },
    updates: { scriptText: result.text, caption },
  };
}

async function executeTts(ctx) {
  const provider = resolve('tts');
  const jobDir = path.join(TMP_DIR, ctx.jobId);
  const result = await provider.synthesize(ctx.scriptText, jobDir);
  return {
    provider: 'tts',
    context: { ttsAudioPath: result.audioPath },
    updates: { ttsAudioPath: result.audioPath },
  };
}

async function executeRendering(ctx) {
  const provider = resolve('renderer');
  const jobDir = path.join(OUTPUTS_DIR, ctx.jobId);
  const result = await provider.render({
    clipPath: ctx.clipPath,
    audioPath: ctx.ttsAudioPath,
    scriptText: ctx.scriptText,
  }, jobDir);
  return {
    provider: 'renderer',
    context: { renderedVideoPath: result.videoPath },
    updates: { renderedVideoPath: result.videoPath },
  };
}

async function executeUploading(ctx) {
  const provider = resolve('storage');
  const result = await provider.upload(ctx.renderedVideoPath);
  return {
    provider: 'storage',
    context: { uploadUrl: result.url },
    updates: { uploadUrl: result.url },
  };
}

async function executePublishing(ctx) {
  const publishMode = config.get('pipeline.publish_mode');
  if (publishMode !== 'live') {
    // Dry-run: record what would happen but don't actually publish
    fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
    const dryPayload = {
      mode: 'dry',
      videoUrl: ctx.uploadUrl,
      caption: ctx.caption,
      timestamp: new Date().toISOString(),
    };
    const payloadPath = path.join(OUTPUTS_DIR, `dry-${ctx.jobId}.json`);
    fs.writeFileSync(payloadPath, JSON.stringify(dryPayload, null, 2));
    return {
      provider: 'publisher',
      context: {},
      updates: { igContainerId: `dry-${Date.now()}`, igMediaId: `dry-${Date.now()}` },
    };
  }

  const provider = resolve('publisher');
  const container = await provider.createContainer({
    videoUrl: ctx.uploadUrl,
    caption: ctx.caption,
  });
  const published = await provider.publishContainer(container.containerId);
  return {
    provider: 'publisher',
    context: {},
    updates: { igContainerId: container.containerId, igMediaId: published.mediaId },
  };
}
