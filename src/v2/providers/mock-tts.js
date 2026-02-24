import fs from 'node:fs';
import path from 'node:path';

export class MockTtsProvider {
  async synthesize(text, outputDir) {
    const outPath = path.join(outputDir, `tts-${Date.now()}.wav`);
    fs.mkdirSync(outputDir, { recursive: true });
    // Write a minimal WAV header (44 bytes) as placeholder
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36, 4); // file size - 8
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(22050, 24); // sample rate
    header.writeUInt32LE(22050, 28); // byte rate
    header.writeUInt16LE(1, 32); // block align
    header.writeUInt16LE(8, 34); // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(0, 40); // data size
    fs.writeFileSync(outPath, header);
    return { audioPath: outPath, durationSecs: 15.0 };
  }
}
