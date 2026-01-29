import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { constants } from 'http2';
import path from 'node:path';

import { createServer } from '~/infra/server';
import { Establishments, formatEstablishmentApi } from '~/repositories/establishmentRepository';
import { Users, formatUserApi } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('POST /documents', () => {
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

  const samplePdfPath = path.join(__dirname, '../../test/sample.pdf');

  it('should upload a single document successfully', async () => {
    const response = await request(url)
      .post('/api/documents')
      .use(tokenProvider(user))
      .attach('files', samplePdfPath);

    expect(response.status).toBe(constants.HTTP_STATUS_CREATED);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: expect.any(String),
      filename: 'sample.pdf',
      url: expect.stringContaining('http'),
      contentType: 'application/pdf'
    });
  });

  it('should upload multiple documents successfully', async () => {
    const response = await request(url)
      .post('/api/documents')
      .use(tokenProvider(user))
      .attach('files', samplePdfPath)
      .attach('files', samplePdfPath);

    expect(response.status).toBe(constants.HTTP_STATUS_CREATED);
    expect(response.body).toHaveLength(2);
  });

  it('should return 207 for partial success', async () => {
    const response = await request(url)
      .post('/api/documents')
      .use(tokenProvider(user))
      .attach('files', samplePdfPath)
      .attach('files', Buffer.from('invalid'), 'invalid.exe');

    expect(response.status).toBe(constants.HTTP_STATUS_MULTI_STATUS);
    expect(response.body).toHaveLength(2);

    const [valid, invalid] = response.body;
    expect(valid).toMatchObject({ filename: 'sample.pdf' });
    expect(invalid).toMatchObject({
      name: 'FileValidationError',
      data: {
        filename: 'invalid.exe',
        reason: 'invalid_file_type'
      }
    });
  });

  it('should return 400 if all files fail validation', async () => {
    const response = await request(url)
      .post('/api/documents')
      .use(tokenProvider(user))
      .attach('files', Buffer.from('bad'), 'bad.exe');

    expect(response.status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
  });

  it('should return 400 if no files provided', async () => {
    const response = await request(url)
      .post('/api/documents')
      .use(tokenProvider(user));

    expect(response.status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
  });
});
