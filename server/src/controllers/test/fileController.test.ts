import { constants } from 'http2';
import path from 'node:path';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { tokenProvider } from '../../test/testUtils';
import { genEstablishmentApi, genUserApi } from '../../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '../../repositories/establishmentRepository';
import { formatUserApi, Users } from '../../repositories/userRepository';
import { createServer } from '~/infra/server';

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

    it('should upload a file', async () => {
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
    });
  });
});
