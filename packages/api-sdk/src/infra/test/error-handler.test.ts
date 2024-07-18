import nock from 'nock';
import axios from 'axios';
import { constants } from 'node:http2';

import createErrorHandler from '../error-handler';

describe('Error handler', () => {
  const host = 'https://api.example.com';
  const http = axios.create({
    baseURL: host,
  });

  beforeAll(() => {
    http.interceptors.response.use(undefined, createErrorHandler());
  });

  it('should return null if the request status is 404 Not found', async () => {
    nock(host).get('/').reply(constants.HTTP_STATUS_NOT_FOUND);

    const { data, status, } = await http.get('/');

    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    expect(data).toBeNull();
  });

  it('should throw the error as usual instead', async () => {
    nock(host).get('/').reply(constants.HTTP_STATUS_BAD_REQUEST);

    await expect(http.get('/')).toReject();
  });
});
