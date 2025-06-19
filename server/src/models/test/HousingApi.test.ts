import { HousingStatus } from '@zerologementvacant/models';
import { EventApi, HousingEventApi } from '~/models/EventApi';
import {
  diffHousingOccupancyUpdated,
  diffHousingStatusUpdated,
  getBuildingLocation,
  HousingApi,
  isSupervised,
  normalizeDataFileYears
} from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import {
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('HousingApi', () => {
  describe('getBuildingLocation', () => {
    it('should parse a building location', () => {
      const housing: HousingApi = {
        ...genHousingApi(),
        buildingLocation: 'B010002002'
      };

      const actual = getBuildingLocation(housing);

      expect(actual).toStrictEqual({
        building: 'Bâtiment B',
        entrance: 'Entrée 1',
        level: 'Rez-de-chaussée',
        local: 'Local 2002'
      });
    });
  });

  describe('isSupervised', () => {
    it.each(['En accompagnement', 'Intervention publique'])(
      `should return true if the housing status is "in progress" and the subStatus is %s`,
      (subStatus) => {
        const housing: HousingApi = {
          ...genHousingApi(),
          status: HousingStatus.IN_PROGRESS,
          subStatus
        };

        const actual = isSupervised(housing, []);

        expect(actual).toBe(true);
      }
    );

    describe('if the housing status is "completed"', () => {
      const establishment = genEstablishmentApi();

      it.each(['N’était pas vacant', 'Sortie de la vacance'])(
        'should return true if the substatus is %s and if the user modified the housing manually',
        (subStatus) => {
          const housing: HousingApi = {
            ...genHousingApi(),
            status: HousingStatus.COMPLETED,
            subStatus
          };
          const creator: UserApi = {
            ...genUserApi(establishment.id),
            email: 'test@test.test'
          };
          const events: HousingEventApi[] = Array.from({ length: 3 }, () => ({
            ...genEventApi({
              type: 'housing:status-updated',
              creator,
              nextOld: {
                status: 'in-progress',
                subStatus: 'En accompagnement'
              },
              nextNew: {
                status: 'completed',
                subStatus
              }
            }),
            housingGeoCode: housing.geoCode,
            housingId: housing.id
          }));

          const actual = isSupervised(housing, events);

          expect(actual).toBeTrue();
        }
      );

      it('should return false if the user did not modify the housing', () => {
        const housing: HousingApi = {
          ...genHousingApi(),
          status: HousingStatus.COMPLETED,
          subStatus: 'Sortie de la vacance'
        };
        const events: HousingEventApi[] = [];

        const actual = isSupervised(housing, events);

        expect(actual).toBeFalse();
      });
    });
  });

  describe('normalizeDataFileYears', () => {
    it('should sort data file years', () => {
      const actual = normalizeDataFileYears([
        'lovac-2020',
        'ff-2023-locatif',
        'lovac-2022',
        'lovac-2021'
      ]);

      expect(actual).toStrictEqual([
        'ff-2023-locatif',
        'lovac-2020',
        'lovac-2021',
        'lovac-2022'
      ]);
    });

    it('should filter duplicates', () => {
      const actual = normalizeDataFileYears([
        'lovac-2021',
        'lovac-2022',
        'lovac-2022'
      ]);

      expect(actual).toStrictEqual(['lovac-2021', 'lovac-2022']);
    });
  });

  describe('diffHousingStatusUpdated', () => {
    it('should return the changed keys', () => {
      const before: EventApi<'housing:status-updated'>['nextOld'] = {
        status: 'Non suivi',
        subStatus: null
      };
      const after: EventApi<'housing:status-updated'>['nextNew'] = {
        status: 'Suivi en cours',
        subStatus: null
      };

      const actual = diffHousingStatusUpdated(
        {
          status: before.status,
          subStatus: before.subStatus
        },
        {
          status: after.status,
          subStatus: after.subStatus
        }
      );

      expect(actual).toStrictEqual<typeof actual>({
        before: {
          status: 'Non suivi'
        },
        after: {
          status: 'Suivi en cours'
        },
        changed: ['status']
      });
    });
  });

  describe('diffHousingOccupancyUpdated', () => {
    it('should return the changed keys', () => {
      const before: EventApi<'housing:occupancy-updated'>['nextOld'] = {
        occupancy: 'Vacant',
        occupancyIntended: 'En location'
      };
      const after: EventApi<'housing:occupancy-updated'>['nextNew'] = {
        occupancy: 'Vacant',
        occupancyIntended: 'Pas d’information'
      };

      const actual = diffHousingOccupancyUpdated(
        {
          occupancy: before.occupancy,
          occupancyIntended: before.occupancyIntended
        },
        {
          occupancy: after.occupancy,
          occupancyIntended: after.occupancyIntended
        }
      );

      expect(actual).toStrictEqual<typeof actual>({
        before: {
          occupancyIntended: 'En location'
        },
        after: {
          occupancyIntended: 'Pas d’information'
        },
        changed: ['occupancyIntended']
      });
    });
  });
});
