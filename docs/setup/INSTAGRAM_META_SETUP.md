# Instagram + Meta Setup

1. Create/prepare Instagram Creator or Business account.
2. Create/connect a Facebook Page.
3. Create Meta Developer app.
4. Add Instagram Graph API product and required permissions.
5. Generate user access token and long-lived token.
6. Retrieve Instagram User ID.
7. Add to `.env.local`:
   - `IG_ACCESS_TOKEN`
   - `IG_IG_USER_ID`
   - optionally `META_APP_ID`, `META_APP_SECRET`
8. Run:
```bash
npm run doctor:ig
```

The current check is non-posting and safe.
