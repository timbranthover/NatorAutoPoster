import * as config from '../core/config.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export class InstagramGraphPublisher {
  async createContainer({ videoUrl, caption }) {
    const token = config.get('ig.access_token');
    const userId = config.get('ig.user_id');
    if (!token || !userId) {
      throw new Error('Missing IG_ACCESS_TOKEN or IG_IG_USER_ID. Run: nator doctor');
    }

    const url = `${GRAPH_API_BASE}/${userId}/media`;
    const body = {
      video_url: videoUrl,
      caption: caption || '',
      media_type: 'REELS',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`IG container creation failed (${res.status}): ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return { containerId: data.id, videoUrl, caption };
  }

  async publishContainer(containerId) {
    const token = config.get('ig.access_token');
    const userId = config.get('ig.user_id');

    // Poll until the container is ready (IG processes the video asynchronously)
    await this._waitForContainer(containerId, token);

    const url = `${GRAPH_API_BASE}/${userId}/media_publish`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ creation_id: containerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`IG publish failed (${res.status}): ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return { mediaId: data.id, containerId, published: true };
  }

  async validateCredentials() {
    const token = config.get('ig.access_token');
    const userId = config.get('ig.user_id');
    if (!token || !userId) {
      return { ok: false, message: 'Missing IG_ACCESS_TOKEN or IG_IG_USER_ID' };
    }

    const url = `${GRAPH_API_BASE}/${userId}?fields=id,username&access_token=${token}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, message: `API error: ${err.error?.message || res.statusText}` };
      }
      const data = await res.json();
      return { ok: true, message: `Connected as @${data.username || data.id}` };
    } catch (err) {
      return { ok: false, message: `Network error: ${err.message}` };
    }
  }

  async _waitForContainer(containerId, token, maxWaitMs = 120000) {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status_code === 'FINISHED') return;
        if (data.status_code === 'ERROR') {
          throw new Error(`Container processing failed: ${data.status || 'unknown error'}`);
        }
      }
      await new Promise(r => setTimeout(r, pollInterval));
    }
    throw new Error(`Container ${containerId} not ready after ${maxWaitMs / 1000}s`);
  }
}
