import { register } from '../core/registry.js';
import { MockScriptProvider } from './mock-script.js';
import { MockTtsProvider } from './mock-tts.js';
import { MockRendererProvider } from './mock-renderer.js';
import { MockStorageProvider } from './mock-storage.js';
import { MockPublisherProvider } from './mock-publisher.js';

export function registerAllProviders() {
  // Mock providers (always available)
  register('script', 'mock', MockScriptProvider);
  register('tts', 'mock', MockTtsProvider);
  register('renderer', 'mock', MockRendererProvider);
  register('storage', 'mock', MockStorageProvider);
  register('publisher', 'mock', MockPublisherProvider);

  // Real providers will be registered here as they're implemented:
  // register('storage', 'tunnel', TunnelStorageProvider);
  // register('storage', 'r2', R2StorageProvider);
  // register('publisher', 'instagram', InstagramGraphPublisher);
  // register('tts', 'edge', EdgeTtsProvider);
  // register('renderer', 'ffmpeg', FfmpegRendererProvider);
}
