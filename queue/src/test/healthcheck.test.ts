import http from 'node:http';
import { constants } from 'node:http2';
import request from 'supertest';

import createServer from '../server';
import registerHealthcheck from '../healthcheck';

describe('Healthcheck API', () => {
  const { app, } = createServer();
  let listener: http.Server;

  beforeAll(async () => {
    return new Promise<void>((resolve) => {
      listener = app.listen(7000, resolve);
    });
  });

  afterAll(async () => {
    return new Promise<void>((resolve, reject) => {
      listener.close((error) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  });

  it('should return 200 OK if healthy', async () => {
    registerHealthcheck(listener);

    const { status, } = await request(listener).get('/');

    expect(status).toBe(constants.HTTP_STATUS_OK);
  });
});
