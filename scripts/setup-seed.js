import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data/app.db.json');
if (!fs.existsSync(dbPath)) {
  console.error('Run npm run setup:init first.');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
db.settings = {
  publishMode: db.settings.publishMode || 'dry',
  timezone: db.settings.timezone || 'UTC',
  schedulerEnabled: db.settings.schedulerEnabled ?? false,
  killSwitchPath: db.settings.killSwitchPath || './tmp/KILL_SWITCH',
  maxPostsPerDay: db.settings.maxPostsPerDay || 3,
  duplicateDetection: true,
};
db.voices = db.voices || [{ id: 'mock-en', provider: 'mock', label: 'Mock EN Voice' }];
db.scheduleWindows = db.scheduleWindows || [{ id: 'weekday-am', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '11:00' }];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Seeded defaults into data/app.db.json');
