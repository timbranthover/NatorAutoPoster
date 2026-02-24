# Go-Live Checklist

- [ ] 3 successful dry-runs (`npm run pipeline:dryrun`).
- [ ] `npm run doctor:r2` with real upload pass.
- [ ] `npm run doctor:ig` token/account check pass.
- [ ] One explicit `npm run pipeline:test-live` success.
- [ ] Kill switch tested (`KILL_SWITCH_PATH`).
- [ ] `MAX_POSTS_PER_DAY <= 5`.
- [ ] Publish windows configured.
- [ ] Duplicate detection enabled.
- [ ] Dry->Live mode switch explicitly confirmed.
