import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync, spawn } from 'node:child_process';
import * as config from '../core/config.js';

export class TunnelStorageProvider {
  async upload(filePath) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }

    const port = parseInt(config.get('tunnel.port') || '8787', 10);
    const timeoutSecs = parseInt(config.get('tunnel.timeout_secs') || '300', 10);
    const fileName = path.basename(absPath);

    // 1. Start a temporary HTTP server to serve the file
    const server = http.createServer((req, res) => {
      if (req.url === `/${fileName}`) {
        const stat = fs.statSync(absPath);
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': stat.size,
        });
        fs.createReadStream(absPath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    await new Promise((resolve, reject) => {
      server.listen(port, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });

    try {
      // 2. Check if cloudflared is available
      const cloudflaredCheck = this._checkCloudflared();
      if (!cloudflaredCheck.ok) {
        server.close();
        throw new Error(`cloudflared not available: ${cloudflaredCheck.message}. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`);
      }

      // 3. Start cloudflared quick tunnel
      const tunnelUrl = await this._startTunnel(port, timeoutSecs);

      const publicUrl = `${tunnelUrl}/${fileName}`;

      // 4. Schedule cleanup after timeout
      setTimeout(() => {
        server.close();
      }, timeoutSecs * 1000);

      return {
        url: publicUrl,
        expiresAt: new Date(Date.now() + timeoutSecs * 1000).toISOString(),
        _server: server,
      };
    } catch (err) {
      server.close();
      throw err;
    }
  }

  async remove(_url) {
    // Tunnel URLs expire automatically — nothing to clean up
    return { ok: true };
  }

  _checkCloudflared() {
    try {
      execSync('cloudflared --version', { stdio: ['ignore', 'pipe', 'pipe'] });
      return { ok: true };
    } catch {
      return { ok: false, message: 'cloudflared binary not found on PATH' };
    }
  }

  _startTunnel(port, timeoutSecs) {
    return new Promise((resolve, reject) => {
      const proc = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let tunnelUrl = null;
      const timer = setTimeout(() => {
        if (!tunnelUrl) {
          proc.kill();
          reject(new Error('Tunnel startup timed out (30s)'));
        }
      }, 30000);

      const handleData = (data) => {
        const output = data.toString();
        // cloudflared prints the tunnel URL to stderr
        const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !tunnelUrl) {
          tunnelUrl = match[0];
          clearTimeout(timer);
          resolve(tunnelUrl);
        }
      };

      proc.stdout.on('data', handleData);
      proc.stderr.on('data', handleData);

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start cloudflared: ${err.message}`));
      });

      proc.on('exit', (code) => {
        if (!tunnelUrl) {
          clearTimeout(timer);
          reject(new Error(`cloudflared exited with code ${code} before producing URL`));
        }
      });

      // Auto-kill after timeout
      setTimeout(() => proc.kill(), timeoutSecs * 1000);
    });
  }
}
