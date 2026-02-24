# V1 Audit — NatorAutoPoster

## Overview

V1 is a **CLI-first local scaffold** for an Instagram Reels auto-poster. It was bootstrapped by Codex in a single commit and provides mock infrastructure to validate the setup flow before external credentials are available.

**Repo state:** 3 commits on `main`, 1 merged PR from `codex/implement-setup-orchestration-for-project`.

---

## What Exists in V1

### File Structure
```
scripts/           – 10 CLI scripts (doctor, setup, pipeline, clip ingest)
src/lib/           – 4 modules (env, adapters, checks, job-runner)
data/app.db.json   – JSON file database
docs/setup/        – 5 setup guides (R2, IG, env vars, go-live, local)
```

### Architecture
- **No runtime dependencies** — zero `node_modules`, no `package.json` dependencies
- **ESM modules** (`"type": "module"`)
- **JSON file database** (`data/app.db.json`) with jobs, settings, clips, runs, voices, scheduleWindows
- **Hand-rolled `.env.local` parser** (no dotenv)
- **Mock adapters** for storage and publishing
- **Linear script-based workflow** — each script is run independently via npm

### Key Modules
| Module | Purpose | Status |
|---|---|---|
| `src/lib/env.js` | .env.local parser, `requiredEnv()`, `mask()` | Working |
| `src/lib/adapters.js` | Mock + interface stubs for R2 and IG | Stubs only |
| `src/lib/checks.js` | `runCommand()`, folder/DB checks, status icons | Working |
| `src/lib/job-runner.js` | `enqueueJob()`, `listQueuedJobs()` | Minimal, working |

### Key Scripts
| Script | Purpose | Status |
|---|---|---|
| `setup-init.js` | Create folders, copy .env template, init DB | Working |
| `setup-seed.js` | Seed default settings into JSON DB | Working |
| `setup-wizard.js` | Display status table with fix suggestions | Working |
| `doctor.js` | Consolidated health check (node, npm, ffmpeg, folders, DB, env) | Working |
| `doctor-ffmpeg.js` | FFmpeg/ffprobe presence check | Working |
| `doctor-r2.js` | R2 env var check + test file creation (no network) | Stub |
| `doctor-ig.js` | IG env var check (no network validation) | Stub |
| `pipeline-dryrun.js` | Generate mock payload JSON | Working |
| `pipeline-test-live.js` | Guarded stub — refuses without explicit confirmation | Stub |
| `clip-ingest.js` | Add clip metadata to JSON DB | Working |

---

## What Is Working

1. **Project initialization flow** — `setup:init` → `setup:seed` → `doctor` → `setup:wizard` → `pipeline:dryrun` all execute without errors
2. **Health check system** — doctor scripts correctly identify missing tools and env vars
3. **Dry-run pipeline** — generates a timestamped JSON payload file in `outputs/`
4. **Clip ingestion** — registers clip files in the JSON database
5. **Safety gates** — live publish requires explicit `PUBLISH_MODE=live` + `CONFIRM_LIVE_TEST=YES_I_UNDERSTAND`
6. **Setup documentation** — comprehensive guides for R2, IG, env vars, go-live

---

## What Is Stubbed / Missing

### Critical Missing Pieces
1. **No actual video rendering** — no FFmpeg pipeline, no video assembly, no background composition
2. **No TTS/voice generation** — TTS_PROVIDER referenced but no implementation exists
3. **No script/content generation** — no AI or template-based script creation
4. **No R2 upload implementation** — `R2AdapterInterface.upload()` throws "not yet wired"
5. **No Instagram Graph API publisher** — `InstagramPublisherInterface.publish()` throws "not implemented"
6. **No scheduler** — `SCHEDULER_ENABLED` is checked but no cron/interval loop exists
7. **No queue processing loop** — `enqueueJob()` writes to DB but nothing reads and processes jobs
8. **No duplicate detection** — setting exists but no implementation
9. **No kill switch enforcement** — path is configured but never read/checked at runtime

### Missing Infrastructure
- No npm dependencies installed (not even `dotenv`, `@aws-sdk/client-s3`, etc.)
- No test framework or tests
- No error handling beyond basic try/catch in checks
- No logging framework
- No retry/backoff logic
- No rate limiting enforcement
- No token refresh for IG access tokens

---

## Technical Debt / Risks

### High Risk
1. **JSON file database** — no concurrency safety, no atomic writes, no transactions. Multiple processes writing simultaneously will corrupt data.
2. **No pipeline orchestration** — scripts are independent with no state machine or job lifecycle. A failed mid-pipeline job has no resume path.
3. **No dependency management** — zero packages means everything must be built from scratch (HTTP client, S3 SDK, cron, etc.)

### Medium Risk
4. **Hand-rolled env parser** — doesn't handle quoted values, multiline, or escape sequences correctly.
5. **Synchronous file I/O throughout** — `fs.readFileSync` / `fs.writeFileSync` everywhere; will block event loop under load.
6. **No schema validation** — JSON DB has no schema enforcement; corrupt data propagates silently.
7. **Flat script architecture** — no shared pipeline context, no dependency injection, no provider registry.

### Low Risk
8. **No `.gitkeep` strategy** — empty directories may not persist across clones.
9. **Dual env files** — `.env.example` and `.env.local.example` are identical, creating confusion.

---

## What Should Be Kept

1. **Safety-first philosophy** — dry-run default, explicit live confirmation, kill switch concept, max posts/day limit
2. **Doctor/wizard pattern** — structured health checks with fix suggestions is excellent UX
3. **Setup documentation** — the 5 docs in `docs/setup/` are well-written and useful
4. **Clip ingestion concept** — registering source clips with metadata is the right data model
5. **ESM module format** — modern, forward-compatible
6. **Provider/adapter abstraction concept** — mock vs real is the right pattern (needs proper implementation)

---

## What Should Be Replaced

1. **JSON file DB → SQLite** — proper concurrency, schema, queries, WAL mode, still local-first
2. **Linear scripts → State machine pipeline** — jobs with defined states and transitions, resumable from any step
3. **No dependencies → Minimal curated deps** — `better-sqlite3`, `@aws-sdk/client-s3`, `node-cron` at minimum
4. **Flat script architecture → Plugin/provider registry** — DI-based provider loading, config-driven swapping
5. **Mock-only adapters → Tiered adapters** — mock → free (tunnel) → paid (R2) with automatic fallback
6. **R2-first public URL → Tunnel-first** — use free `cloudflared` tunnel for public video URLs; R2 as upgrade path
7. **Independent scripts → Unified CLI entry point** — single `nator` command with subcommands
