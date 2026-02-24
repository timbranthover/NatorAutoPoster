import { loadDotEnvLocal } from '../src/lib/env.js';

loadDotEnvLocal();
if (process.env.PUBLISH_MODE !== 'live') {
  console.error('Refusing live test: set PUBLISH_MODE=live in .env.local to continue.');
  process.exit(1);
}
if (process.env.CONFIRM_LIVE_TEST !== 'YES_I_UNDERSTAND') {
  console.error('Refusing live test: set CONFIRM_LIVE_TEST=YES_I_UNDERSTAND for explicit confirmation.');
  process.exit(1);
}

console.log('Live publish test stub reached.');
console.log('Implement real publisher adapter before production use.');
