export class MockStorageProvider {
  async upload(filePath) {
    return {
      url: `mock://storage/${filePath.replace(/\\/g, '/')}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  async remove(_url) {
    return { ok: true };
  }
}
