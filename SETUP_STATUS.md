# Setup Status

## Environment / local tools
- Status: IN PROGRESS
- Notes: `npm run doctor` includes Node/npm/tool checks.

## FFmpeg
- Status: IN PROGRESS
- Notes: Check available with `npm run doctor:ffmpeg`.

## Node/npm
- Status: DONE
- Notes: Automated validation wired in `npm run doctor`.

## Python (if needed)
- Status: NOT STARTED
- Notes: No Python modules required in current scaffold.

## Cloudflare R2
- Status: BLOCKED
- Missing item: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.

## Meta Developer App
- Status: BLOCKED
- Missing item: Meta Developer app creation + Instagram product config.

## Instagram account + account type
- Status: BLOCKED
- Missing item: Creator/Business Instagram account linked to Facebook Page.

## Instagram Graph API token / IG User ID
- Status: BLOCKED
- Missing item: `IG_ACCESS_TOKEN` and `IG_IG_USER_ID`.

## App env vars
- Status: IN PROGRESS
- Notes: Templates created in `.env.example` and `.env.local.example`.

## Dry-run pipeline verification
- Status: DONE
- Notes: `npm run pipeline:dryrun` outputs payload JSON in `outputs/`.

## Live publish verification
- Status: NOT STARTED
- Notes: Waiting for R2 + IG credentials and live adapter wiring.
