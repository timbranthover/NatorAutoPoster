# V1 Path vs V2 Alt Path — Comparison Summary

## Product Goal

Both paths build an **Instagram Reels auto-poster** that:
- Uses the official Instagram Graph API for publishing
- Runs local-first (no cloud compute required)
- Defaults to free/cheap options
- Has safety gates (dry-run, kill switch, post limits)

---

## Architecture Comparison

| Dimension | V1 (Script Chain) | V2 (State Machine) |
|---|---|---|
| **Branch** | `main` | `alt/v2-state-machine` |
| **Orchestration** | Independent npm scripts run manually | Finite state machine — jobs walk through PENDING → SCRIPTING → TTS → RENDERING → UPLOADING → PUBLISHING → DONE |
| **Database** | JSON file (`data/app.db.json`) | SQLite with WAL mode (`data/nator.db`) |
| **Job resume** | None — no recovery after failure | Resume from `lastGoodState` — skip completed steps on retry |
| **Provider system** | Hardcoded mock classes, interface stubs | Registry + dependency injection — swap providers via config |
| **Public video URL** | R2 only (blocked until credentials) | Tunnel-first (free via cloudflared), R2 as upgrade |
| **CLI** | 10 separate `npm run` scripts | Unified `nator` CLI with subcommands |
| **Doctor/checks** | CLI-only output, script per check | Programmatic API returning structured results |
| **Config** | Env vars only (hand-rolled parser) | SQLite config table + env var overlay (env wins) |
| **Dependencies** | Zero npm packages | `better-sqlite3`, `node-cron` |
| **Scheduler** | Not implemented | Ready for `node-cron` integration |
| **Kill switch** | Config path set but never enforced | Checked before every pipeline run |
| **Post limits** | Config value but never enforced | Checked before every pipeline run |
| **Duplicate detection** | Setting exists, no implementation | Ready for content-hash based detection |

---

## State Machine Detail (V2)

```
                    ┌─────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │SCRIPTING │──── Generate script/caption
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │   TTS    │──── Text-to-speech audio
                    └────┬─────┘
                         │
                    ┌────▼──────┐
                    │ RENDERING │──── FFmpeg video assembly
                    └────┬──────┘
                         │
                    ┌────▼──────┐
                    │ UPLOADING │──── Tunnel/R2 public URL
                    └────┬──────┘
                         │
                    ┌────▼───────┐
                    │ PUBLISHING │──── IG Graph API
                    └────┬───────┘
                         │
                    ┌────▼─────┐
                    │   DONE   │
                    └──────────┘

      Any state ──► FAILED (with lastGoodState recorded)
      FAILED ──► retry from lastGoodState
```

---

## Provider Registry (V2)

| Type | Available Providers | Default |
|---|---|---|
| `script` | `mock` | `mock` |
| `tts` | `mock` | `mock` |
| `renderer` | `mock`, `ffmpeg` | `mock` |
| `storage` | `mock`, `tunnel`, `r2` | `mock` |
| `publisher` | `mock`, `instagram` | `mock` |

Switch provider: `nator config provider.storage tunnel`

---

## What V1 Does Better

- **Zero dependencies** — nothing to install
- **Simpler mental model** — each script is self-contained
- **Easier to read** — flat file structure, no abstractions

## What V2 Does Better

- **Resumable jobs** — don't redo completed work after failures
- **Provider swapping** — change storage/publisher/renderer via one config key
- **Concurrent-safe** — SQLite WAL mode vs JSON file corruption risk
- **Free-first unblocked** — tunnel provider removes R2 requirement for development
- **Safety enforcement** — kill switch and post limits actually checked at runtime
- **Unified interface** — one CLI vs 10 scripts
- **Queryable state** — see all jobs, filter by state, view run history

---

## How to Switch Between Paths

```bash
# Use V1 pipeline
PIPELINE_ENGINE=v1 node scripts/pipeline-run.js

# Use V2 pipeline (default on alt branch)
PIPELINE_ENGINE=alt node scripts/pipeline-run.js

# Or use V2 CLI directly
node src/v2/cli/nator.js run
```

---

## File Layout

```
V1 files (unchanged on alt branch):
  src/lib/             — V1 modules
  scripts/*.js         — V1 CLI scripts
  data/app.db.json     — V1 JSON database

V2 files (new on alt branch):
  src/v2/core/         — DB, config, states, pipeline, registry, jobs, clips, doctor
  src/v2/providers/    — Mock + real provider implementations
  src/v2/cli/nator.js  — Unified CLI
  data/nator.db        — V2 SQLite database (gitignored)
```
