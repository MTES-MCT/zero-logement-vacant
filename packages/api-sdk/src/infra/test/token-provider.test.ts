import { faker } from '@faker-js/faker';
import axios from 'axios';
import nock from 'nock';
import { constants } from 'node:http2';

import createTokenProvider from '../token-provider';

describe('Token provider', () => {
  const host = 'https://api.example.com';

  beforeAll(() => {
    nock(host).get('/').reply(constants.HTTP_STATUS_NO_CONTENT);
  });

  it('should provide a token', async () => {
    const http = axios.create({
      baseURL: host,
    });
    // Axios interceptors order is reversed.
    // See https://github.com/axios/axios/pull/1041
    http.interceptors.request.use((config) => {
      expect(config.headers).toHaveProperty('Authorization');
      return config;
    });
    http.interceptors.request.use(createTokenProvider(faker.string.uuid()));

    await http.get('/');
  });
});
