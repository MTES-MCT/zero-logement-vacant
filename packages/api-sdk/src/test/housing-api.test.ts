import { faker } from '@faker-js/faker';
import nock from 'nock';
import { constants } from 'node:http2';

import { createSDK } from '../sdk';
import config from '../infra/config';

describe('Housing API', () => {
  const api = createSDK({
    establishment: faker.string.uuid(),
  });

  describe('find', () => {
    it('should return a list of housing', async () => {
      nock(config.api.host)
        .post('/housing')
        .reply(constants.HTTP_STATUS_OK, []);

      const actual = await api.housing.find();

      expect(actual).toStrictEqual([]);
    });
  });
});
