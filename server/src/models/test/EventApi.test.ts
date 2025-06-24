import { faker } from '@faker-js/faker/locale/fr';
import { Occupancy } from '@zerologementvacant/models';

import { HousingEventApi, isUserModified } from '~/models/EventApi';
import { UserApi } from '~/models/UserApi';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('EventApi', () => {
  describe('isUserModified', () => {
    const establishment = genEstablishmentApi();
    const housing = genHousingApi();

    it('should throw an error if the event creator is missing', () => {
      const creator: UserApi = genUserApi(establishment.id);
      const event: HousingEventApi = {
        ...genEventApi({
          type: 'housing:created',
          creator,
          nextOld: null,
          nextNew: {
            source: 'datafoncier-manual',
            occupancy: Occupancy.VACANT
          }
        }),
        housingGeoCode: housing.geoCode,
        housingId: housing.id,
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
        const event = genEventApi({
          type: 'housing:occupancy-updated',
          creator,
          nextOld: { occupancy: Occupancy.VACANT },
          nextNew: { occupancy: Occupancy.RENT }
        });

        const actual = isUserModified(event);

        expect(actual).toBeFalse();
      }
    );

    const emails = faker.helpers.multiple(() => faker.internet.email(), {
      count: 10
    });

    it.each(emails)('should return true otherwise (%s)', (email) => {
      const creator: UserApi = { ...genUserApi(establishment.id), email };
      const event = genEventApi({
        type: 'housing:occupancy-updated',
        creator,
        nextOld: { occupancy: Occupancy.VACANT },
        nextNew: { occupancy: Occupancy.RENT }
      });

      const actual = isUserModified(event);

      expect(actual).toBeTrue();
    });
  });
});
