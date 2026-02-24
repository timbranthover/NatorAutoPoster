export class MockPublisherProvider {
  async createContainer({ videoUrl, caption }) {
    return {
      containerId: `mock-container-${Date.now()}`,
      videoUrl,
      caption,
    };
  }

  async publishContainer(containerId) {
    return {
      mediaId: `mock-media-${Date.now()}`,
      containerId,
      published: true,
    };
  }

  async validateCredentials() {
    return { ok: true, message: 'Mock credentials valid' };
  }
}
