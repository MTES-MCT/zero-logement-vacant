import { describe, it, expect, beforeAll } from 'vitest';
import { Either, Array as EffectArray } from 'effect';
import { createS3 } from '@zerologementvacant/utils/node';
import { S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';

import { uploadDocuments } from '../document-upload';
import config from '~/infra/config';
import { Users, formatUserApi } from '~/repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { genUserApi, genEstablishmentApi } from '~/test/testFixtures';

describe('document-upload', () => {
  let s3: S3Client;
  let user: ReturnType<typeof genUserApi>;
  let establishment: ReturnType<typeof genEstablishmentApi>;
  let samplePdfBuffer: Buffer;

  beforeAll(async () => {
    s3 = createS3({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    });

    establishment = genEstablishmentApi('12345');
    await Establishments().insert(formatEstablishmentApi(establishment));

    user = genUserApi(establishment.id);
    await Users().insert(formatUserApi(user));

    // Load sample PDF file
    const samplePdfPath = path.join(__dirname, '../../test/sample.pdf');
    samplePdfBuffer = fs.readFileSync(samplePdfPath);
  });

  const mockFile = (
    filename: string,
    mimetype: string,
    buffer: Buffer
  ): Express.Multer.File => ({
    fieldname: 'files',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    stream: {} as any,
    destination: '',
    filename: '',
    path: ''
  });

  describe('uploadDocuments', () => {
    it('should validate and upload files successfully', async () => {
      const file = mockFile('test.pdf', 'application/pdf', samplePdfBuffer);

      const results = await uploadDocuments([file], {
        s3,
        bucket: config.s3.bucket,
        establishmentId: establishment.id,
        userId: user.id,
        user,
        generateS3Key: (file, index) =>
          `documents/${establishment.id}/${index}/${file.originalname}`
      });

      expect(results).toHaveLength(1);
      expect(Either.isRight(results[0])).toBe(true);

      if (Either.isRight(results[0])) {
        expect(results[0].right).toMatchObject({
          id: expect.any(String),
          filename: 'test.pdf',
          s3Key: expect.stringContaining(`documents/${establishment.id}`),
          establishmentId: establishment.id,
          createdBy: user.id,
          contentType: 'application/pdf',
          sizeBytes: samplePdfBuffer.length
        });
      }
    });

    it('should return validation errors for invalid files', async () => {
      const invalidBuffer = Buffer.from('invalid content');
      const file = mockFile('bad.exe', 'application/octet-stream', invalidBuffer);

      const results = await uploadDocuments([file], {
        s3,
        bucket: config.s3.bucket,
        establishmentId: establishment.id,
        userId: user.id,
        user,
        generateS3Key: (file, index) => `documents/${index}`
      });

      expect(results).toHaveLength(1);
      expect(Either.isLeft(results[0])).toBe(true);

      if (Either.isLeft(results[0])) {
        expect(results[0].left).toMatchObject({
          name: 'FileValidationError',
          data: {
            filename: 'bad.exe',
            reason: 'invalid_file_type'
          }
        });
      }
    });

    it('should handle partial success (some files fail)', async () => {
      const invalidBuffer = Buffer.from('invalid content');

      const validFile = mockFile('valid.pdf', 'application/pdf', samplePdfBuffer);
      const invalidFile = mockFile('invalid.exe', 'application/octet-stream', invalidBuffer);

      const results = await uploadDocuments([validFile, invalidFile], {
        s3,
        bucket: config.s3.bucket,
        establishmentId: establishment.id,
        userId: user.id,
        user,
        generateS3Key: (file) => `documents/${file.originalname}`
      });

      expect(results).toHaveLength(2);
      expect(Either.isRight(results[0])).toBe(true); // First succeeded
      expect(Either.isLeft(results[1])).toBe(true); // Second failed
    });

    it('should upload multiple valid files successfully', async () => {
      const files = [
        mockFile('test1.pdf', 'application/pdf', samplePdfBuffer),
        mockFile('test2.pdf', 'application/pdf', samplePdfBuffer)
      ];

      const results = await uploadDocuments(files, {
        s3,
        bucket: config.s3.bucket,
        establishmentId: establishment.id,
        userId: user.id,
        user,
        generateS3Key: (file, index) => `documents/${index}/${file.originalname}`
      });

      expect(results).toHaveLength(2);
      expect(Either.isRight(results[0])).toBe(true);
      expect(Either.isRight(results[1])).toBe(true);

      const validResults = EffectArray.getRights(results);
      expect(validResults).toHaveLength(2);
    });

    it('should store document metadata correctly', async () => {
      const file = mockFile('metadata-test.pdf', 'application/pdf', samplePdfBuffer);

      const results = await uploadDocuments([file], {
        s3,
        bucket: config.s3.bucket,
        establishmentId: establishment.id,
        userId: user.id,
        user,
        generateS3Key: (file) => `documents/${file.originalname}`
      });

      expect(Either.isRight(results[0])).toBe(true);

      if (Either.isRight(results[0])) {
        const document = results[0].right;
        expect(document.creator).toMatchObject({
          id: user.id,
          email: user.email
        });
        expect(document.createdAt).toBeTruthy();
        expect(document.updatedAt).toBeNull();
        expect(document.deletedAt).toBeNull();
      }
    });
  });
});
