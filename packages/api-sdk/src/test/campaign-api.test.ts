import { faker } from '@faker-js/faker';
import nock from 'nock';
import { AsyncLocalStorage } from 'node:async_hooks';
import { constants } from 'node:http2';

import { createSDK } from '../sdk';

describe('Campaign API', () => {
  const host = 'api.zerologementvacant.beta.gouv.fr';
  const api = createSDK({
    api: {
      host
    },
    auth: {
      secret: 'secret'
    },
    db: {
      url: 'postgres://localhost:5432'
    },
    logger: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn()
    },
    storage: new AsyncLocalStorage<{ establishment: string }>()
  });

  describe('get', () => {
    it('should return null if the campaign is missing', async () => {
      const id = faker.string.uuid();
      nock(host).get(`/campaigns/${id}`).reply(constants.HTTP_STATUS_NOT_FOUND);

      const actual = await api.campaign.get(id);

      expect(actual).toBeNull();
    });

    it('should return the campaign if it exists', async () => {
      const id = faker.string.uuid();
      const campaign = { id };
      nock(host)
        .get(`/campaigns/${id}`)
        .reply(constants.HTTP_STATUS_OK, campaign);

      const actual = await api.campaign.get(id);

      expect(actual).toStrictEqual(campaign);
    });
  });
});
