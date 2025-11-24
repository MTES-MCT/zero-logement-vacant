import { constants } from 'http2';
import path from 'node:path';
import fs from 'node:fs';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { tokenProvider } from '../../test/testUtils';
import { genEstablishmentApi, genUserApi } from '../../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '../../repositories/establishmentRepository';
import { formatUserApi, Users } from '../../repositories/userRepository';

// EICAR test file - standard antivirus test string
const EICAR_TEST_FILE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

describe('File API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('POST /files', () => {
    const testRoute = '/api/files';

    it('should upload a valid PNG file', async () => {
      // Create a valid 1x1 PNG file
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);

      const tmpPath = path.join(import.meta.dirname, 'test-upload.png');
      fs.writeFileSync(tmpPath, pngBuffer);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_CREATED);
        expect(body).toStrictEqual({
          content: expect.stringMatching(/^data:([^;]+);/),
          id: expect.any(String),
          type: 'image/png',
          url: expect.any(String)
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should upload an existing JPEG file', async () => {
      const { body, status } = await request(url)
        .post(testRoute)
        .attach('file', path.join(import.meta.dirname, 'test.jpeg'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual({
        content: expect.stringMatching(/^data:([^;]+);/),
        id: expect.any(String),
        type: 'image/jpeg',
        url: expect.any(String)
      });
    }, 30000);

    it.skip('should reject EICAR test file with virus detected error', async () => {
      const tmpPath = path.join(import.meta.dirname, 'eicar-test.txt');
      fs.writeFileSync(tmpPath, EICAR_TEST_FILE);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({
          error: 'Virus detected',
          reason: 'virus_detected',
          message: expect.stringContaining('malicious content'),
          details: {
            filename: expect.any(String),
            viruses: expect.arrayContaining([
              expect.stringContaining('EICAR')
            ])
          }
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should reject file with wrong MIME type', async () => {
      // Create a text file pretending to be PNG
      const txtContent = 'This is a text file, not an image';
      const tmpPath = path.join(import.meta.dirname, 'fake.png');
      fs.writeFileSync(tmpPath, txtContent);

      try {
        const { body, status } = await request(url)
          .post(testRoute)
          .attach('file', tmpPath)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({
          name: 'BadRequestError',
          message: 'Bad request'
        });
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);

    it('should reject file that is too large', async () => {
      // Create a 1MB file - using smaller file to avoid EPIPE issues
      // Default limit is 5MB but we test with smaller file for performance
      const largeBuffer = Buffer.alloc(1 * 1024 * 1024, 'a');
      const tmpPath = path.join(import.meta.dirname, 'large.txt');
      fs.writeFileSync(tmpPath, largeBuffer);

      try {
        // Temporarily lower limit for this specific test
        const originalLimit = process.env.FILE_UPLOAD_MAX_SIZE_MB;
        process.env.FILE_UPLOAD_MAX_SIZE_MB = '0.5';

        try {
          const { status } = await request(url)
            .post(testRoute)
            .attach('file', tmpPath)
            .use(tokenProvider(user));

          // Either rejected with 400 or connection closed with EPIPE
          expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        } catch (error: any) {
          // EPIPE is acceptable - server closed connection due to size
          expect(error.code).toBe('EPIPE');
        } finally {
          if (originalLimit) {
            process.env.FILE_UPLOAD_MAX_SIZE_MB = originalLimit;
          } else {
            delete process.env.FILE_UPLOAD_MAX_SIZE_MB;
          }
        }
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }, 30000);
  });
});
