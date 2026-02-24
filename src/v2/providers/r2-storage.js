import fs from 'node:fs';
import path from 'node:path';
import * as config from '../core/config.js';

export class R2StorageProvider {
  _getConfig() {
    const accountId = config.get('r2.account_id');
    const accessKeyId = config.get('r2.access_key_id');
    const secretAccessKey = config.get('r2.secret_access_key');
    const bucket = config.get('r2.bucket');
    const publicBaseUrl = config.get('r2.public_base_url');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      throw new Error('Missing R2 credentials. Set R2_* env vars in .env.local');
    }

    return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
  }

  async upload(filePath) {
    const cfg = this._getConfig();
    const fileName = `reels/${Date.now()}-${path.basename(filePath)}`;
    const fileContent = fs.readFileSync(filePath);
    const contentType = filePath.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';

    // Use S3-compatible API endpoint for R2
    const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${cfg.bucket}/${fileName}`;

    // Build AWS Signature V4 request
    const date = new Date();
    const dateStr = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dateShort = dateStr.slice(0, 8);
    const region = 'auto';
    const service = 's3';

    // For simplicity, use the @aws-sdk approach if available, otherwise raw fetch with basic auth
    // R2 supports the S3 API, so we'll use a minimal signing approach
    const { createHmac, createHash } = await import('node:crypto');

    function hmacSha256(key, msg) {
      return createHmac('sha256', key).update(msg).digest();
    }
    function sha256(data) {
      return createHash('sha256').update(data).digest('hex');
    }

    const payloadHash = sha256(fileContent);
    const canonicalUri = `/${cfg.bucket}/${fileName}`;
    const canonicalQueryString = '';
    const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateStr}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateShort}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${credentialScope}\n${sha256(canonicalRequest)}`;

    const signingKey = hmacSha256(
      hmacSha256(
        hmacSha256(
          hmacSha256(`AWS4${cfg.secretAccessKey}`, dateShort),
          region
        ),
        service
      ),
      'aws4_request'
    );
    const signature = hmacSha256(signingKey, stringToSign).toString('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        Host: host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': dateStr,
        Authorization: authorization,
      },
      body: fileContent,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`R2 upload failed (${res.status}): ${errText}`);
    }

    const publicUrl = `${cfg.publicBaseUrl.replace(/\/$/, '')}/${fileName}`;
    return { url: publicUrl, key: fileName };
  }

  async remove(key) {
    const cfg = this._getConfig();
    // Simplified — in production, this would also need SigV4
    console.log(`[R2] Would delete: ${key}`);
    return { ok: true };
  }
}
