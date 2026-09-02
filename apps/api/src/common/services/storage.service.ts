import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private bucket: string;
  private endpoint: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('MINIO_BUCKET') || 'amatis-files';
    this.endpoint = this.config.get('MINIO_ENDPOINT') || 'localhost';
    this.client = new Minio.Client({
      endPoint: this.endpoint,
      port: Number(this.config.get('MINIO_PORT') || 9000),
      useSSL: this.config.get('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get('MINIO_ACCESS_KEY') || 'amatis',
      secretKey: this.config.get('MINIO_SECRET_KEY') || 'amatis_secret',
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      }
      // make bucket public-read so avatars/files are accessible by URL
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
    } catch (e) {
      this.logger.warn(`MinIO init failed (falling back to local disk): ${(e as Error).message}`);
    }
  }

  private get isAvailable(): boolean {
    return !!this.config.get('MINIO_ENDPOINT');
  }

  async uploadFile(localPath: string, objectName: string): Promise<string> {
    try {
      await this.client.fPutObject(this.bucket, objectName, localPath);
      return `http://${this.endpoint}:${this.config.get('MINIO_PORT') || 9000}/${this.bucket}/${objectName}`;
    } catch (e) {
      this.logger.warn(`MinIO upload failed, using local: ${(e as Error).message}`);
      return `/uploads/${objectName}`;
    }
  }

  async uploadBuffer(buffer: Buffer, objectName: string): Promise<string> {
    try {
      await this.client.putObject(this.bucket, objectName, buffer);
      return `http://${this.endpoint}:${this.config.get('MINIO_PORT') || 9000}/${this.bucket}/${objectName}`;
    } catch (e) {
      this.logger.warn(`MinIO buffer upload failed: ${(e as Error).message}`);
      return `/uploads/${objectName}`;
    }
  }
}
