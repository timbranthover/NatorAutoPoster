import { register } from '../core/registry.js';
import { MockScriptProvider } from './mock-script.js';
import { MockTtsProvider } from './mock-tts.js';
import { MockRendererProvider } from './mock-renderer.js';
import { MockStorageProvider } from './mock-storage.js';
import { MockPublisherProvider } from './mock-publisher.js';
import { InstagramGraphPublisher } from './instagram-graph.js';
import { R2StorageProvider } from './r2-storage.js';
import { TunnelStorageProvider } from './tunnel-storage.js';
import { FfmpegRendererProvider } from './ffmpeg-renderer.js';
import { EdgeTtsProvider } from './edge-tts.js';

export function registerAllProviders() {
  // Mock providers (always available, zero dependencies)
  register('script', 'mock', MockScriptProvider);
  register('tts', 'mock', MockTtsProvider);
  register('renderer', 'mock', MockRendererProvider);
  register('storage', 'mock', MockStorageProvider);
  register('publisher', 'mock', MockPublisherProvider);

  // Real providers
  register('storage', 'tunnel', TunnelStorageProvider);
  register('storage', 'r2', R2StorageProvider);
  register('publisher', 'instagram', InstagramGraphPublisher);
  register('renderer', 'ffmpeg', FfmpegRendererProvider);

  register('tts', 'edge', EdgeTtsProvider);

  // Future providers:
  // register('script', 'openai', OpenAIScriptProvider);
}
