# NatorAutoPoster (Local-First Scaffold)

This repository currently ships a **CLI-first setup wizard + dry-run pipeline** so development can continue before external credentials are available.

## Quick start

```bash
npm run setup:init
npm run setup:seed
npm run doctor
npm run setup:wizard
npm run pipeline:dryrun
```

## Running Setup Status Table

| Area | Status | Notes |
|---|---|---|
| Environment / local tools | IN PROGRESS | Node/npm checks scripted via `npm run doctor`. |
| FFmpeg | IN PROGRESS | Verified with `npm run doctor:ffmpeg`. |
| Node/npm | DONE | Automated check implemented in `doctor`. |
| Python (if needed) | NOT STARTED | Not required in current scaffold. |
| Cloudflare R2 | BLOCKED | Waiting for real credentials + SDK wiring. |
| Meta Developer App | BLOCKED | Requires manual setup in Meta portal. |
| Instagram account + account type | BLOCKED | Requires manual account + Creator/Business mode. |
| Instagram Graph API token / IG User ID | BLOCKED | Needs Meta app + generated token. |
| App env vars | IN PROGRESS | `.env.example` + `.env.local.example` provided. |
| Dry-run pipeline verification | DONE | `npm run pipeline:dryrun` writes payload JSON. |
| Live publish verification | NOT STARTED | Blocked until R2 + IG checks pass. |

## Available scripts

- `npm run doctor` - consolidated health check.
- `npm run doctor:r2` - validates R2 vars and prepares upload probe file.
- `npm run doctor:ig` - validates IG vars for safe check mode.
- `npm run doctor:ffmpeg` - ffmpeg/ffprobe presence check.
- `npm run setup:init` - creates folders, env local, and db file.
- `npm run setup:seed` - seeds config defaults.
- `npm run setup:wizard` - setup status wizard with fix commands.
- `npm run pipeline:dryrun` - runs complete mock payload generation.
- `npm run pipeline:test-live` - guarded live publish stub.

## Safety gates before going live

1. 3+ successful `npm run pipeline:dryrun` runs.
2. `npm run doctor:r2` passes with real upload test.
3. `npm run doctor:ig` passes with token/account sanity call.
4. One successful controlled live test publish.
5. Kill switch path configured and tested.
6. Max posts/day <= 5.
7. Publish windows configured.
8. Duplicate detection enabled.
9. Dry-run to live switch explicitly confirmed.

See `SETUP_STATUS.md` and `docs/setup/*` for detailed operating steps.
