# Cloudflare R2 Setup

1. Create an R2 bucket in Cloudflare dashboard.
2. Create API token/key with write access to that bucket.
3. Capture:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_PUBLIC_BASE_URL`
4. Add values to `.env.local`.
5. Run:
```bash
npm run doctor:r2
```

Current scaffold validates env + creates test file; replace with live SDK upload in Phase B.
