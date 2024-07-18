import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import {
  genCampaignApi,
  genEstablishmentApi,
  genUserApi
} from '~/test/testFixtures';
import queue from '~/infra/queue';
import { tokenProvider } from '~/test/testUtils';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { setImmediate } from 'async';

const TIMEOUT = 10_000;

describe('Server-sent event API', () => {
  const { app, } = createServer();
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const testRoute = '/api/sse';

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  it(
    'should wait for an event',
    (done) => {
      const campaign = genCampaignApi(establishment.id, user.id);
      jest.spyOn(queue, 'on').mockImplementation((event, callback) => {
        setImmediate(() => {
          callback({ id: campaign.id, });
        });
      });

      request(app)
        .get(testRoute)
        .use(tokenProvider(user))
        .buffer(false)
        .parse((response, callback) => {
          try {
            expect(response.statusCode).toBe(constants.HTTP_STATUS_OK);
            expect(response.headers).toMatchObject({
              'content-type': 'text/event-stream',
              connection: 'keep-alive',
              'cache-control': 'no-cache',
            });

            response.setEncoding('utf8');
            response.once('data', (chunk) => {
              expect(chunk).toBe('event: campaign:generate\n');

              response.once('data', (chunk) => {
                expect(chunk).toBe(
                  `data: ${JSON.stringify({ id: campaign.id, })}\n\n`
                );
                callback(null, response);
              });
            });
          } catch (error) {
            done(error);
          }
        })
        .end((error) => {
          done(error);
        });
    },
    TIMEOUT
  );
});
