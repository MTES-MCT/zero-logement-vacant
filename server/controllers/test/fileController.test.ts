import { constants } from 'http2';
import path from 'node:path';
import request from 'supertest';

import { createServer } from '../../server';
import { tokenProvider } from '../../test/testUtils';
import { genEstablishmentApi, genUserApi } from '../../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '../../repositories/establishmentRepository';
import { formatUserApi, Users } from '../../repositories/userRepository';

describe('File API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('POST /files', () => {
    const testRoute = '/api/files';

    it('should upload a file', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .attach('file', path.join(__dirname, 'test.jpeg'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual({
        id: expect.any(String),
        type: 'image/jpeg',
        url: expect.any(String),
      });
    });
  });
});
