# NatorAutoPoster — V2 State Machine Pipeline

Local-first Instagram Reels auto-poster. V2 is now main. Uses a state machine pipeline, SQLite, and a provider registry so mock → real is a one-line config change.

## Quick Start

```bash
npm install
node src/v2/cli/nator.js setup
node src/v2/cli/nator.js doctor
node src/v2/cli/nator.js ingest <your-clip.mp4>
node src/v2/cli/nator.js run
```

## CLI Commands

```
nator setup              — Init database and seed defaults
nator doctor             — Health check (tools, folders, credentials)
nator ingest <file>      — Register a source clip
nator run                — Process next job through full pipeline
nator run --watch        — Continuously process jobs as they arrive
nator retry <job-id>     — Resume a failed job from its last good state
nator status             — Pipeline summary (counts by state)
nator jobs [state]       — List jobs, optionally filtered by state
nator clips [status]     — List ingested clips
nator config [key] [val] — Read or write config (no args = show all)
nator providers          — List available providers, active shown in [brackets]
nator schedule           — Start cron scheduler
nator migrate-v1         — Import clips + settings from V1 JSON DB
```

## Pipeline States

```
PENDING → SCRIPTING → TTS → RENDERING → UPLOADING → PUBLISHING → DONE
                                                                 ↘ FAILED (resumable)
```

Each step persists to SQLite before moving on. A failed job records `lastGoodState` — retry resumes from exactly where it left off.

## Providers (Swap with One Config Line)

| Type | Mock (default) | Free | Paid |
|---|---|---|---|
| `script` | `mock` | *(template/AI next)* | — |
| `tts` | `mock` | `edge` (Edge TTS, needs internet) | — |
| `renderer` | `mock` | `ffmpeg` | — |
| `storage` | `mock` | `tunnel` (cloudflared) | `r2` |
| `publisher` | `mock` | — | `instagram` |

Switch provider:
```bash
node src/v2/cli/nator.js config provider.storage tunnel
node src/v2/cli/nator.js config provider.publisher instagram
node src/v2/cli/nator.js config provider.renderer ffmpeg
```

## Going Live Checklist

1. `nator doctor` — all green
2. `nator config provider.tts edge` — real voice-over (Microsoft Edge TTS)
3. `nator config provider.renderer ffmpeg` — real video rendering
4. Set IG credentials in `.env.local` (`IG_ACCESS_TOKEN`, `IG_IG_USER_ID`)
5. `nator config provider.publisher instagram`
6. Choose storage: `tunnel` (free, temporary) or `r2` (permanent)
7. `nator config pipeline.publish_mode live`
8. Run a test: `nator run`
9. Watch the job walk all states: `nator status`
10. Enable scheduler: `nator config scheduler.enabled true` then `nator schedule`

## Safety Gates

- `PUBLISH_MODE=dry` (default) — writes JSON payloads, never calls IG API
- `MAX_POSTS_PER_DAY=3` — hard cap enforced before every publish step
- Kill switch: `touch ./tmp/KILL_SWITCH` — pipeline refuses to run until removed
- Scheduler only fires inside configured cron windows

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Required for live publishing
IG_ACCESS_TOKEN=
IG_IG_USER_ID=

# Required for R2 storage (optional — use tunnel instead)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=

# Switch from dry to live when ready
PUBLISH_MODE=dry

# Override pipeline engine (v1 keeps old script chain)
PIPELINE_ENGINE=alt
```

## What's Next to Build

1. **Script generation** — template engine or GPT-4o-mini for captions/hooks
3. **Duplicate detection** — content hash gate before queuing
4. **Token refresh** — IG long-lived token rotation before 60-day expiry
5. **Publish window enforcement** — time-of-day gate layered into scheduler

## V1 Preserved

Original V1 scripts are still in `scripts/` and `src/lib/`. Run V1:
```bash
PIPELINE_ENGINE=v1 node scripts/pipeline-run.js
```

See `docs/review/` for the full V1 audit, V2 plan, and V1 vs V2 comparison.
