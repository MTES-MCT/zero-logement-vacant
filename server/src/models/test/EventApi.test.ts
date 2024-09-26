import { faker } from '@faker-js/faker/locale/fr';

import { HousingEventApi, isUserModified } from '~/models/EventApi';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingEventApi,
  genUserApi
} from '~/test/testFixtures';
import { UserApi } from '~/models/UserApi';

describe('EventApi', () => {
  describe('isUserModified', async () => {
    const establishment = genEstablishmentApi();
    const housing = await genHousingApi();

    it('should throw an error if the event creator is missing', async () => {
      const creator: UserApi = genUserApi(establishment.id);
      const housingApiEvent = await genHousingEventApi(housing, creator);
      const event: HousingEventApi = {
        ...housingApiEvent,
        creator: undefined
      };

      const actual = () => isUserModified(event);

      expect(actual).toThrow();
    });

    it.each(['@zerologementvacant.beta.gouv.fr', '@beta.gouv.fr'])(
      'should return false if the event creator’s email ends with %s',
      async (domain) => {
        const creator: UserApi = {
          ...genUserApi(establishment.id),
          email: `admin${domain}`
        };
        const event = await genHousingEventApi(housing, creator);

        const actual = isUserModified(event);

        expect(actual).toBeFalse();
      }
    );

    const emails = faker.helpers.multiple(() => faker.internet.email(), {
      count: 10
    });

    it.each(emails)('should return true otherwise (%s)', async (email) => {
      const creator: UserApi = { ...genUserApi(establishment.id), email };
      const event = await genHousingEventApi(housing, creator);

      const actual = isUserModified(event);

      expect(actual).toBeTrue();
    });
  });
});
