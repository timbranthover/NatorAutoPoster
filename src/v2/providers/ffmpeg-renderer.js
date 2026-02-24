import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export class FfmpegRendererProvider {
  async render({ clipPath, audioPath, scriptText }, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const outPath = path.join(outputDir, `reel-${Date.now()}.mp4`);

    // Build FFmpeg command for a basic reel:
    // - Use clip as video base
    // - Overlay TTS audio
    // - Scale to 1080x1920 (9:16 portrait for Reels)
    // - Limit duration to 60 seconds
    const hasClip = clipPath && fs.existsSync(clipPath);
    const hasAudio = audioPath && fs.existsSync(audioPath);

    if (!hasClip && !hasAudio) {
      throw new Error('Need at least a clip or audio file to render');
    }

    const inputs = [];
    const filters = [];
    let mapArgs = '';

    if (hasClip) {
      inputs.push(`-i "${clipPath}"`);
      // Scale to 1080x1920, pad if needed
      filters.push('scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black');
    }

    if (hasAudio) {
      inputs.push(`-i "${audioPath}"`);
      if (hasClip) {
        // Use clip video + TTS audio, take shortest
        mapArgs = '-map 0:v:0 -map 1:a:0 -shortest';
      }
    }

    const filterStr = filters.length > 0 ? `-vf "${filters.join(',')}"` : '';
    const cmd = [
      'ffmpeg -y',
      ...inputs,
      filterStr,
      mapArgs,
      '-c:v libx264 -preset fast -crf 23',
      '-c:a aac -b:a 128k',
      '-t 60',
      '-movflags +faststart',
      `"${outPath}"`,
    ].filter(Boolean).join(' ');

    try {
      execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
    } catch (err) {
      const stderr = err.stderr?.toString() || err.message;
      throw new Error(`FFmpeg render failed: ${stderr.slice(0, 500)}`);
    }

    if (!fs.existsSync(outPath)) {
      throw new Error('FFmpeg produced no output file');
    }

    // Get duration
    let durationSecs = 0;
    try {
      const probe = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outPath}"`, {
        stdio: ['ignore', 'pipe', 'pipe'],
      }).toString().trim();
      durationSecs = parseFloat(probe) || 0;
    } catch { /* ignore probe errors */ }

    return { videoPath: outPath, durationSecs };
  }
}
