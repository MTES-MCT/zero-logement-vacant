import {
  getBuildingLocation,
  HousingApi,
  isSupervised
} from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingEventApi,
  genUserApi
} from '~/test/testFixtures';
import { HousingEventApi } from '~/models/EventApi';
import { UserApi } from '~/models/UserApi';

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
          status: HousingStatusApi.InProgress,
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
            status: HousingStatusApi.Completed,
            subStatus
          };
          const creator: UserApi = {
            ...genUserApi(establishment.id),
            email: 'test@test.test'
          };
          const events: HousingEventApi[] = Array.from({ length: 3 }, () =>
            genHousingEventApi(housing, creator)
          );

          const actual = isSupervised(housing, events);

          expect(actual).toBeTrue();
        }
      );

      it('should return false if the user did not modify the housing', () => {
        const housing: HousingApi = {
          ...genHousingApi(),
          status: HousingStatusApi.Completed,
          subStatus: 'Sortie de la vacance'
        };
        const events: HousingEventApi[] = [];

        const actual = isSupervised(housing, events);

        expect(actual).toBeFalse();
      });
    });
  });
});
