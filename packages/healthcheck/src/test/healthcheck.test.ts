import express from 'express';
import { constants } from 'node:http2';
import request from 'supertest';

import { CheckStatus, healthcheck } from '../healthcheck';
import { redisCheck } from '../checks/redis';
import { postgresCheck } from '../checks/postgres';

describe('Healthcheck API', () => {
  it('should return HTTP 200 OK', async () => {
    const app = express();
    app.get(
      '/',
      healthcheck({
        checks: [
          redisCheck('redis://localhost:6379'),
          postgresCheck('postgres://postgres:postgres@localhost:5432'),
        ],
      }),
    );

    const { body, status } = await request(app).get('/');

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(body.checks).toSatisfyAll<CheckStatus>((check) => {
      return check.status === 'up';
    });
  });

  it('should return HTTP 503 if a service is down', async () => {
    const app = express();
    app.get(
      '/',
      healthcheck({
        checks: [
          redisCheck('redis://localhost:6000'),
          postgresCheck('postgres://postgres:postgres@localhost:5000'),
        ],
      }),
    );

    const { body, status } = await request(app).get('/');

    expect(status).toBe(constants.HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(body.checks).toIncludeSameMembers<CheckStatus>([
      { name: 'redis', status: 'down' },
      { name: 'postgres', status: 'down' },
    ]);
  });
});
