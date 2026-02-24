import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import * as config from '../core/config.js';

/**
 * EdgeTtsProvider — free offline TTS via Microsoft Edge Read Aloud API.
 * Requires internet on first run (fetches from edge.microsoft.com).
 * Outputs MP3 to the job's tmp dir.
 *
 * Config:
 *   tts.voice — Edge TTS voice name (default: en-US-JennyNeural)
 */
export class EdgeTtsProvider {
  async synthesize(text, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });

    const voice = config.get('tts.voice') || 'en-US-JennyNeural';

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Writes {outputDir}/audio.mp3; returns { audioFilePath, metadataFilePath, requestId }
    const { audioFilePath: audioPath } = await tts.toFile(outputDir, text);

    // Try ffprobe for real duration; fall back to word-count estimate
    const durationSecs = await probeDuration(audioPath) ?? estimateDuration(text);

    return { audioPath, durationSecs };
  }
}

async function probeDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8', timeout: 10_000 },
    );
    const secs = parseFloat(out.trim());
    return secs > 0 ? secs : null;
  } catch {
    return null;
  }
}

function estimateDuration(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, (words / 150) * 60); // ~150 WPM
}
