# Local Setup

## 1) Initialize project
```bash
npm run setup:init
npm run setup:seed
```

## 2) Run health checks
```bash
npm run doctor
npm run setup:wizard
```

## 3) Verify dry-run pipeline
```bash
npm run pipeline:dryrun
```

Expected output: JSON payload file in `outputs/`.
