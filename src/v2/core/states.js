// Job states for the V2 pipeline state machine
export const STATES = {
  PENDING: 'pending',
  SCRIPTING: 'scripting',
  TTS: 'tts',
  RENDERING: 'rendering',
  UPLOADING: 'uploading',
  PUBLISHING: 'publishing',
  DONE: 'done',
  FAILED: 'failed',
};

// Valid state transitions
const TRANSITIONS = {
  [STATES.PENDING]:    [STATES.SCRIPTING, STATES.FAILED],
  [STATES.SCRIPTING]:  [STATES.TTS, STATES.FAILED],
  [STATES.TTS]:        [STATES.RENDERING, STATES.FAILED],
  [STATES.RENDERING]:  [STATES.UPLOADING, STATES.FAILED],
  [STATES.UPLOADING]:  [STATES.PUBLISHING, STATES.FAILED],
  [STATES.PUBLISHING]: [STATES.DONE, STATES.FAILED],
  [STATES.DONE]:       [],
  [STATES.FAILED]:     [STATES.PENDING, STATES.SCRIPTING, STATES.TTS, STATES.RENDERING, STATES.UPLOADING, STATES.PUBLISHING],
};

// Which provider type handles each state transition
export const STATE_PROVIDERS = {
  [STATES.SCRIPTING]:  'script',
  [STATES.TTS]:        'tts',
  [STATES.RENDERING]:  'renderer',
  [STATES.UPLOADING]:  'storage',
  [STATES.PUBLISHING]: 'publisher',
};

// The processing order (skip PENDING, DONE, FAILED)
export const PIPELINE_ORDER = [
  STATES.SCRIPTING,
  STATES.TTS,
  STATES.RENDERING,
  STATES.UPLOADING,
  STATES.PUBLISHING,
];

export function canTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function nextState(current) {
  const idx = PIPELINE_ORDER.indexOf(current);
  if (idx === -1) return null;
  if (idx === PIPELINE_ORDER.length - 1) return STATES.DONE;
  return PIPELINE_ORDER[idx + 1];
}

export function isTerminal(state) {
  return state === STATES.DONE || state === STATES.FAILED;
}

export function resumeState(job) {
  // When retrying a failed job, resume from last good state's next step
  if (job.state !== STATES.FAILED) return null;
  if (!job.last_good_state) return STATES.SCRIPTING;
  return nextState(job.last_good_state);
}
