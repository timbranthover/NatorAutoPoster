import { runCommand } from '../src/lib/checks.js';

const ffmpeg = runCommand('ffmpeg -version');
const ffprobe = runCommand('ffprobe -version');

if (!ffmpeg.ok || !ffprobe.ok) {
  console.error('FFmpeg check failed. Install ffmpeg + ffprobe and ensure PATH is set.');
  if (!ffmpeg.ok) console.error(`ffmpeg: ${ffmpeg.output}`);
  if (!ffprobe.ok) console.error(`ffprobe: ${ffprobe.output}`);
  process.exit(1);
}

console.log('ffmpeg and ffprobe are available.');
