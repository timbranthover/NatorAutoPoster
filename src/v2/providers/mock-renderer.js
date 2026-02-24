import fs from 'node:fs';
import path from 'node:path';

export class MockRendererProvider {
  async render({ clipPath, audioPath, scriptText }, outputDir) {
    const outPath = path.join(outputDir, `rendered-${Date.now()}.mp4`);
    fs.mkdirSync(outputDir, { recursive: true });
    // Write a placeholder file with render manifest
    const manifest = {
      type: 'mock-render',
      inputs: { clipPath, audioPath, scriptText: scriptText?.slice(0, 50) },
      output: outPath,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    return { videoPath: outPath, durationSecs: 30.0 };
  }
}
