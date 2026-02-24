import * as config from './config.js';

const providers = new Map();

export function register(type, name, ProviderClass) {
  const key = `${type}:${name}`;
  providers.set(key, ProviderClass);
}

export function resolve(type) {
  const configKey = `provider.${type}`;
  const name = config.get(configKey) || 'mock';
  const key = `${type}:${name}`;
  const ProviderClass = providers.get(key);
  if (!ProviderClass) {
    throw new Error(`No provider registered for ${key}. Available: ${listProviders(type).join(', ')}`);
  }
  return new ProviderClass();
}

export function listProviders(type) {
  const prefix = `${type}:`;
  return Array.from(providers.keys())
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length));
}

export function listAllProviders() {
  const result = {};
  for (const key of providers.keys()) {
    const [type, name] = key.split(':');
    if (!result[type]) result[type] = [];
    result[type].push(name);
  }
  return result;
}

export function clear() {
  providers.clear();
}
