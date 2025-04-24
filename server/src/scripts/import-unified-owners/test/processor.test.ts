import { faker } from '@faker-js/faker/locale/fr';
import { List } from 'immutable';
import { ReadableStream } from 'node:stream/web';
import { HousingApi } from '~/models/HousingApi';
import {
  AWAITING_OWNER_RANK,
  HOUSING_OWNER_RANKS,
  HousingOwnerApi
} from '~/models/HousingOwnerApi';
import { DepartmentalOwnerDBO } from '~/repositories/departmentalOwnersRepository';

import {
  createProcessor,
  isDepartmentalOwner,
  isNationalOwner,
  toPairs
} from '~/scripts/import-unified-owners/processor';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';

describe('Processor', () => {
  function createNationalHousingOwner(housing: HousingApi): HousingOwnerApi {
    const owner = genOwnerApi();
    return {
      ...genHousingOwnerApi(housing, owner),
      idpersonne: undefined,
      idprocpte: undefined,
      idprodroit: undefined,
      rank: AWAITING_OWNER_RANK
    };
  }

  function createDepartmentalHousingOwner(
    housing: HousingApi
  ): HousingOwnerApi {
    const owner = genOwnerApi();
    return {
      ...genHousingOwnerApi(housing, owner),
      idpersonne: faker.string.alphanumeric(8),
      idprocpte: faker.string.alphanumeric(10),
      rank: faker.helpers.arrayElement(HOUSING_OWNER_RANKS)
    };
  }

  describe('For each housing containing an active departmental owner and a national owner awaiting treatment', () => {
    const housing = genHousingApi();
    const nationalOwner = createNationalHousingOwner(housing);
    const departmentalOwner = createDepartmentalHousingOwner(housing);

    const findHousingOwners = jest.fn(async () => [
      nationalOwner,
      departmentalOwner
    ]);
    const updateHousingOwner = jest.fn(async () => {});
    const removeHousingOwner = jest.fn(async () => {});
    const removeEvents = jest.fn(async () => {});

    beforeAll(async () => {
      const stream = new ReadableStream<DepartmentalOwnerDBO>({
        pull(controller) {
          controller.enqueue({
            owner_id: nationalOwner.id,
            owner_idpersonne: departmentalOwner.idpersonne as string
          });
          controller.close();
        }
      });
      const processor = createProcessor({
        findHousingOwners,
        updateHousingOwner,
        removeHousingOwner,
        removeEvents
      });

      await stream.pipeTo(processor);
    });

    it('should replace the departmental owner’s rank by the national owner', () => {
      expect(updateHousingOwner).toHaveBeenCalledOnce();
      expect(updateHousingOwner).toHaveBeenCalledWith({
        ...nationalOwner,
        rank: departmentalOwner.rank
      });
    });

    it('should remove the departmental owner from the housing', () => {
      expect(removeHousingOwner).toHaveBeenCalledOnce();
      expect(removeHousingOwner).toHaveBeenCalledWith(departmentalOwner);
    });

    it('should remove the events concerning a change of ownership', () => {
      expect(removeEvents).toHaveBeenCalledOnce();
      expect(removeEvents).toHaveBeenCalledWith({ housingId: housing.id });
    });
  });

  describe('toPairs', () => {
    it('should return pairs of national and departmental owners grouped by housing', () => {
      const housings = Array.from({ length: 3 }, () => genHousingApi());
      const housingOwners = housings
        .map((housing) => {
          return [
            createNationalHousingOwner(housing),
            createDepartmentalHousingOwner(housing)
          ];
        })
        .flat();

      const actual = toPairs(housingOwners);

      expect(actual).toSatisfyAll<List<HousingOwnerApi>>((pair) => {
        return (
          isNationalOwner(pair.get(0) as HousingOwnerApi) &&
          isDepartmentalOwner(pair.get(1) as HousingOwnerApi)
        );
      });
    });
  });

  describe('isNationalOwner', () => {
    it('should return true if the housing owner has no "idprocpte"', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        idpersonne: undefined
      };

      const actual = isNationalOwner(housingOwner);

      expect(actual).toBeTrue();
    });

    it('should return false otherwise', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        idpersonne: faker.string.alphanumeric(10)
      };

      const actual = isNationalOwner(housingOwner);

      expect(actual).toBeFalse();
    });
  });

  describe('isDepartmentalOwner', () => {
    it('should return true if the housing owner has an "idprocpte"', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        idpersonne: faker.string.alphanumeric(10)
      };

      const actual = isDepartmentalOwner(housingOwner);

      expect(actual).toBeTrue();
    });

    it('should return false otherwise', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        idpersonne: undefined
      };

      const actual = isDepartmentalOwner(housingOwner);

      expect(actual).toBeFalse();
    });
  });
});
