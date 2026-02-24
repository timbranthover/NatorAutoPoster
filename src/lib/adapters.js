export class MockStorageAdapter {
  async upload(filePath) {
    return { ok: true, url: `mock://storage/${filePath}` };
  }
}

export class MockInstagramPublisher {
  async publish(payload) {
    return { ok: true, mode: 'dry', payload };
  }

  async validateToken() {
    return { ok: true, message: 'Mock token validation passed.' };
  }
}

export class R2AdapterInterface {
  async upload(_filePath) {
    throw new Error('R2 adapter not yet wired to SDK.');
  }
}

export class InstagramPublisherInterface {
  async publish(_payload) {
    throw new Error('Instagram live publisher not implemented.');
  }
}
