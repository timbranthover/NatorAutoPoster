import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnvLocal, requiredEnv, mask } from '../src/lib/env.js';

loadDotEnvLocal();
const keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'];
const missing = requiredEnv(keys);

if (missing.length) {
  console.error(`Missing R2 env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('R2 env vars present:');
for (const key of keys) console.log(`- ${key}=${mask(process.env[key])}`);

const probeFile = path.join(process.cwd(), 'tmp/r2-upload-test.txt');
fs.mkdirSync(path.dirname(probeFile), { recursive: true });
fs.writeFileSync(probeFile, `R2 test ${new Date().toISOString()}\n`);

console.log('Dry verification only: network upload is not implemented in this local scaffold.');
console.log(`Prepared test file: ${probeFile}`);
console.log('Next step: wire this file to the real R2 SDK upload in Phase B.');
