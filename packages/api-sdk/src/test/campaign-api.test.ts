import { faker } from '@faker-js/faker/locale/fr';
import axios from 'axios';
import nock from 'nock';
import { constants } from 'node:http2';
import qs from 'qs';

import { createCampaignAPI } from '../campaign-api';

describe('Campaign API', () => {
  const host = 'https://api.zerologementvacant.beta.gouv.fr';
  const http = axios.create({
    baseURL: host,
    headers: {
      'Content-Type': 'application/json'
    },
    paramsSerializer: (query) => qs.stringify(query, { arrayFormat: 'comma' })
  });
  const api = createCampaignAPI(http);

  describe('get', () => {
    it('should return null if the campaign is missing', async () => {
      const id = faker.string.uuid();
      nock(host).get(`/campaigns/${id}`).reply(constants.HTTP_STATUS_NOT_FOUND);

      const get = () => api.get(id);

      await expect(get()).toReject();
    });

    it('should return the campaign if it exists', async () => {
      const id = faker.string.uuid();
      const campaign = { id };
      nock(host)
        .get(`/campaigns/${id}`)
        .reply(constants.HTTP_STATUS_OK, campaign);

      const actual = await api.get(id);

      expect(actual).toStrictEqual(campaign);
    });
  });
});
