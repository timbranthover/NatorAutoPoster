import { loadDotEnvLocal, requiredEnv, mask } from '../src/lib/env.js';

loadDotEnvLocal();
const keys = ['IG_ACCESS_TOKEN', 'IG_IG_USER_ID'];
const missing = requiredEnv(keys);

if (missing.length) {
  console.error(`Missing Instagram env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Instagram env vars found:');
for (const key of keys) console.log(`- ${key}=${mask(process.env[key])}`);

console.log('Safe sanity check mode: no network validation implemented in scaffold.');
console.log('When credentials are ready, replace with Graph API /me and /{ig-user-id} checks.');
