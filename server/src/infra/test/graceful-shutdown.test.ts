import http from 'node:http';
import { constants } from 'node:http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import gracefulShutdown from '~/infra/graceful-shutdown';

describe('Graceful shutdown', () => {
  const { app } = createServer();

  describe('Healthcheck', () => {
    const testRoute = '/healthcheck';
    let listener: http.Server;

    beforeAll(async () => {
      return new Promise<void>((resolve) => {
        listener = app.listen(6000, resolve);
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
      gracefulShutdown(listener);

      const { status } = await request(listener).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });
  });
});
