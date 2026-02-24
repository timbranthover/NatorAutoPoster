# Alternative Direction Plan — V2 "State Machine Pipeline"

## Summary

V2 replaces V1's linear script-chain approach with an **event-driven state machine pipeline** where each job transitions through well-defined states, persists progress at each step, and can resume from the last successful state after failures. It uses **SQLite** instead of a JSON file, a **provider registry** with dependency injection, and a **tunnel-first** strategy for free public video URLs.

---

## How V2 Differs from V1

| Dimension | V1 (Script Chain) | V2 (State Machine) |
|---|---|---|
| **Orchestration** | Independent scripts run manually | State machine with defined transitions per job |
| **Job persistence** | JSON file, no resume | SQLite with WAL mode, resume from any state |
| **Pipeline model** | One-shot dry-run script | Multi-step: PENDING → SCRIPTING → TTS → RENDERING → UPLOADING → PUBLISHING → DONE |
| **Failure handling** | Script exits with error, no recovery | Job moves to FAILED state with `lastGoodState`, retryable |
| **Provider loading** | Hardcoded mock classes | Registry pattern — providers loaded by config key |
| **Public video URL** | R2-only (paid, blocked) | Tunnel-first (free via cloudflared), R2 as upgrade |
| **Database** | `data/app.db.json` (no concurrency) | SQLite via `better-sqlite3` (WAL mode, concurrent reads) |
| **Config model** | Env vars only | DB-stored config + env var overlay (env wins) |
| **CLI interface** | 10 separate npm scripts | Unified `nator` CLI with subcommands |
| **Doctor/checks** | CLI-only output | Programmatic API returning structured results |
| **Dependencies** | Zero | Minimal curated: `better-sqlite3`, `@aws-sdk/client-s3`, `node-cron` |
| **Coexistence** | N/A | `PIPELINE_ENGINE=v1\|alt` mode switch |

---

## Why It Differs

### 1. State Machine Pipeline (vs Script Chain)
**Problem:** V1 has no concept of a job lifecycle. `pipeline-dryrun.js` generates a payload in one shot — there's no way to track where a job is, resume after failure, or orchestrate multi-step processing.

**Solution:** Each job is a finite state machine:
```
PENDING → SCRIPTING → TTS → RENDERING → UPLOADING → PUBLISHING → DONE
                                                                    ↘ FAILED (retryable from lastGoodState)
```
Each transition calls the appropriate provider, persists state, and emits events. A failed job records which state it reached, so it can be resumed without re-doing completed work.

### 2. SQLite (vs JSON File)
**Problem:** JSON file DB has no concurrency safety, no query capability, no schema enforcement.

**Solution:** `better-sqlite3` gives us:
- WAL mode for concurrent reads during writes
- Schema migrations with version tracking
- Proper indexes for job queries
- Atomic transactions for state transitions
- Still fully local, zero-server, single-file

### 3. Provider Registry (vs Hardcoded Mocks)
**Problem:** V1's adapter classes are directly imported with no way to swap at runtime.

**Solution:** Providers are registered by type (tts, storage, publisher) and resolved by config key:
```js
registry.register('storage', 'mock', MockStorageProvider);
registry.register('storage', 'r2', R2StorageProvider);
registry.register('storage', 'tunnel', TunnelStorageProvider);
const storage = registry.resolve('storage'); // reads config to pick which one
```

### 4. Tunnel-First Public URLs (vs R2-Only)
**Problem:** V1 requires R2 for public video URLs, which is blocked until paid credentials exist.

**Solution:** Use `cloudflared` quick tunnels (free, no account needed) to temporarily serve local files via a public URL during the Instagram upload window. This unblocks development immediately. R2 becomes an explicit upgrade when ready.

**Tradeoff:** Tunnel URLs are temporary (~15 min) but Instagram only needs the URL during the container creation API call. Once IG downloads the video, the URL can expire.

### 5. Unified CLI (vs Separate Scripts)
**Problem:** 10 separate npm scripts with no shared context or argument parsing.

**Solution:** Single `nator` entry point:
```bash
nator doctor          # health checks
nator setup           # interactive setup
nator ingest <file>   # clip ingestion
nator run             # process next queued job
nator run --watch     # process jobs continuously
nator status          # show pipeline status
nator retry <job-id>  # retry failed job from last good state
```

---

## Tradeoffs

### Speed
- **V2 is slower to bootstrap** — needs `npm install` for `better-sqlite3` (native addon)
- **V2 is faster to develop features** — providers snap in, state machine handles edge cases
- **V2 is faster at runtime** — SQLite queries vs full JSON parse/stringify on every operation

### Cost
- **Both are free-first** — V2's tunnel approach removes the R2 cost barrier entirely for development
- **V2 adds `better-sqlite3`** — free, MIT licensed, ~5MB
- **R2 remains optional** — upgrade path when ready, not a blocker

### Reliability
- **V2 is significantly more reliable** — atomic state transitions, resume from failure, concurrent safety
- **V1 risks data corruption** — JSON file writes are non-atomic
- **V2 trades simplicity for correctness** — more code, but each piece has a defined contract

---

## Migration / Coexistence Strategy

### Mode Switch
```env
PIPELINE_ENGINE=v1    # Use original V1 scripts
PIPELINE_ENGINE=alt   # Use V2 state machine pipeline (default on alt branch)
```

### Data Migration
- V2 creates its own `data/nator.db` SQLite file alongside V1's `data/app.db.json`
- A one-time migration script (`nator migrate-v1`) can import V1 clips and settings
- Both can coexist — V1 scripts still read `app.db.json`, V2 reads `nator.db`

### File Isolation
V2 code lives in:
```
src/v2/              – All V2 modules
  core/              – State machine, config, DB
  providers/         – Provider implementations
  cli/               – CLI entry point and subcommands
scripts/nator.js     – V2 CLI entry point
```

V1 code remains untouched in:
```
src/lib/             – V1 modules (unchanged)
scripts/*.js         – V1 scripts (unchanged)
```

---

## Implementation Plan (Incremental)

### Phase 1: Core Infrastructure
1. SQLite database with schema migrations
2. Config model (DB + env overlay)
3. Provider registry with mock providers
4. State machine engine

### Phase 2: Pipeline Steps
5. Job creation and state transitions
6. Mock pipeline run (PENDING → ... → DONE)
7. Doctor as programmatic API
8. CLI entry point (`nator`)

### Phase 3: Real Providers
9. Tunnel-based storage provider (cloudflared)
10. R2 storage provider
11. Instagram Graph API publisher
12. TTS provider (edge-tts or similar free option)

### Phase 4: Production Readiness
13. Scheduler (node-cron)
14. Duplicate detection
15. Kill switch enforcement
16. Rate limiting and publish windows

---

## Product Goal Alignment

| Product Goal | V2 Approach |
|---|---|
| Auto-post Instagram Reels | State machine pipeline with IG Graph API publisher |
| Free-first / cheap-first | Tunnel-first for public URLs, edge-tts for voice, SQLite for storage |
| Official IG Graph API only | `InstagramGraphPublisher` provider — no unofficial APIs |
| Safety gates | Kill switch, max posts/day, publish windows, dry-run default |
| Local-first | SQLite + local files, no cloud services required for dev |
| Resumable | State machine persists at each step, retry from last good state |
