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
  describe('isUserModified', () => {
    const establishment = genEstablishmentApi();
    const housing = genHousingApi();

    it('should throw an error if the event creator is missing', () => {
      const creator: UserApi = genUserApi(establishment.id);
      const event: HousingEventApi = {
        ...genHousingEventApi(housing, creator),
        creator: undefined
      };

      const actual = () => isUserModified(event);

      expect(actual).toThrow();
    });

    it.each(['@zerologementvacant.beta.gouv.fr', '@beta.gouv.fr'])(
      'should return false if the event creator’s email ends with %s',
      (domain) => {
        const creator: UserApi = {
          ...genUserApi(establishment.id),
          email: `admin${domain}`
        };
        const event = genHousingEventApi(housing, creator);

        const actual = isUserModified(event);

        expect(actual).toBeFalse();
      }
    );

    const emails = faker.helpers.multiple(() => faker.internet.email(), {
      count: 10
    });

    it.each(emails)('should return true otherwise (%s)', (email) => {
      const creator: UserApi = { ...genUserApi(establishment.id), email };
      const event = genHousingEventApi(housing, creator);

      const actual = isUserModified(event);

      expect(actual).toBeTrue();
    });
  });
});
