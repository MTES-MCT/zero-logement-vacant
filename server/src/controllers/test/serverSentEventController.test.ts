import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import {
  genCampaignApi,
  genEstablishmentApi,
  genUserApi,
} from '~/test/testFixtures';
import queue from '~/infra/queue';
import { tokenProvider } from '~/test/testUtils';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';

const TIMEOUT = 3_000;

describe('Server-sent event API', () => {
  const { app } = createServer();
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
        callback(campaign.id);
      });

      request(app)
        .get(testRoute)
        .use(tokenProvider(user))
        .buffer(false)
        .parse((response, callback) => {
          expect(response.status).toBe(constants.HTTP_STATUS_OK);
          expect(response.headers).toContainEqual({
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control': 'no-cache',
          });

          response.addListener('data', (chunk) => {
            const data = chunk.toString();
            console.log('Data', data);
            expect(data).toBe(`data: ${campaign.id}\n\n`);
            done();
          });
        });
    },
    TIMEOUT,
  );
});
