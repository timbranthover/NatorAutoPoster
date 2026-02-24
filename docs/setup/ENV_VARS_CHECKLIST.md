# Env Vars Checklist

Copy from `.env.local.example` to `.env.local` and fill:

## Required for dry-run
- `MOCK_MODE=true`
- `PUBLISH_MODE=dry`
- `KILL_SWITCH_PATH=./tmp/KILL_SWITCH`
- `SCHEDULER_ENABLED=false`
- `TIMEZONE=UTC`
- `TTS_PROVIDER=mock`

## Required for R2
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

## Required for Instagram publish
- `IG_ACCESS_TOKEN`
- `IG_IG_USER_ID`
