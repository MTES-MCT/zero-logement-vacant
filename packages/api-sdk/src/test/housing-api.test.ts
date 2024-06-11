import { faker } from '@faker-js/faker';
import nock from 'nock';
import { constants } from 'node:http2';

import { createSDK } from '../sdk';

describe('Housing API', () => {
  const host = 'api.zerologementvacant.beta.gouv.fr';
  const api = createSDK({
    api: {
      host,
    },
    auth: {
      secret: 'secret',
    },
    establishment: faker.string.uuid(),
  });

  describe('find', () => {
    it('should return a list of housing', async () => {
      nock(host).post('/housing').reply(constants.HTTP_STATUS_OK, []);

      const actual = await api.housing.find();

      expect(actual).toStrictEqual([]);
    });
  });
});
