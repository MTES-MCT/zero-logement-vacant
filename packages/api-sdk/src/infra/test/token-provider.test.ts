import { faker } from '@faker-js/faker/locale/fr';
import axios from 'axios';
import { Knex } from 'knex';
import nock from 'nock';
import { AsyncLocalStorage } from 'node:async_hooks';
import { constants } from 'node:http2';

import createTokenProvider from '../token-provider';

describe('Token provider', () => {
  const host = 'https://api.example.com';

  beforeAll(() => {
    nock(host).get('/').reply(constants.HTTP_STATUS_NO_CONTENT);
  });

  it('should provide a token', async () => {
    const db = mockDB();
    const storage = new AsyncLocalStorage<{ establishment: string }>();
    const http = axios.create({
      baseURL: host
    });
    // Axios interceptors order is reversed.
    // See https://github.com/axios/axios/pull/1041
    http.interceptors.request.use((config) => {
      expect(config.headers).toHaveProperty('x-access-token');
      return config;
    });
    http.interceptors.request.use(
      createTokenProvider({
        auth: {
          secret: faker.string.uuid()
        },
        db: db,
        logger: console,
        serviceAccount: faker.internet.email(),
        storage: storage
      })
    );

    await storage.run({ establishment: faker.string.uuid() }, async () => {
      await http.get('/');
    });
  });
});

function mockDB(): Knex {
  const user = {
    id: faker.string.uuid()
  };
  return jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      first: jest.fn().mockResolvedValue(user)
    })
  }) as unknown as Knex;
}
