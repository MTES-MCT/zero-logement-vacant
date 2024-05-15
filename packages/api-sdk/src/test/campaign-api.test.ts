import { faker } from '@faker-js/faker';
import nock from 'nock';
import { constants } from 'node:http2';

import config from '../infra/config';
import { createSDK } from '../sdk';

describe('Campaign API', () => {
  const api = createSDK({
    establishment: faker.string.uuid(),
  });

  describe('get', () => {
    it('should return null if the campaign is missing', async () => {
      const id = faker.string.uuid();
      nock(config.api.host)
        .get(`/campaigns/${id}`)
        .reply(constants.HTTP_STATUS_NOT_FOUND);

      const actual = await api.campaign.get(id);

      expect(actual).toBeNull();
    });

    it('should return the campaign if it exists', async () => {
      const id = faker.string.uuid();
      const campaign = { id };
      nock(config.api.host)
        .get(`/campaigns/${id}`)
        .reply(constants.HTTP_STATUS_OK, campaign);

      const actual = await api.campaign.get(id);

      expect(actual).toStrictEqual(campaign);
    });
  });
});
