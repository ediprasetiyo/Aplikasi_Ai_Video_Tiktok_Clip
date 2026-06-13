import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'node:crypto';

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('R2_BUCKET');
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.getOrThrow<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true, // required for MinIO + most S3-compat
    });
  }

  /**
   * Returns a presigned PUT URL the browser can upload to directly.
   * The key is server-generated to prevent path traversal / collision.
   */
  async presignUpload(opts: {
    userId: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds?: number;
  }): Promise<PresignedUpload> {
    const expiresInSeconds = opts.expiresInSeconds ?? 60 * 60; // 1h
    const ext = mimeToExt(opts.contentType);
    const random = randomBytes(12).toString('hex');
    const key = `source-videos/${opts.userId}/${Date.now()}-${random}${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: opts.contentType,
      ContentLength: opts.contentLength,
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, {
      expiresIn: expiresInSeconds,
      // Force the browser to send these exact headers — value mismatch -> 403
      signableHeaders: new Set(['content-type', 'content-length', 'host']),
    });

    return { uploadUrl, key, expiresInSeconds };
  }

  /**
   * Reads a fixed number of bytes from the start of the object using a Range
   * request. Used by magic-bytes validation post-upload.
   */
  async readPrefix(key: string, byteCount: number): Promise<Buffer> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Range: `bytes=0-${byteCount - 1}`,
    });
    const res = await this.client.send(cmd);
    if (!res.Body) throw new Error('Empty response body');
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async head(key: string): Promise<{ size: number; contentType?: string }> {
    const res = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete ${key}: ${(err as Error).message}`);
    }
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'video/mp4':
      return '.mp4';
    case 'video/quicktime':
      return '.mov';
    case 'video/x-matroska':
      return '.mkv';
    case 'video/webm':
      return '.webm';
    default:
      return '';
  }
}
