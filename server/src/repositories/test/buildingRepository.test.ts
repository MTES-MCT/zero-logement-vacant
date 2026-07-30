import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { BuildingApi } from '~/models/BuildingApi';
import buildingRepository, {
  toBuildingInsert
} from '~/repositories/buildingRepository';
import { factories } from '~/test/factories';
import { genBuildingApi } from '~/test/testFixtures';

describe('Building repository', () => {
  describe('find', () => {
    let buildings: ReadonlyArray<BuildingApi>;

    beforeAll(async () => {
      buildings = await factories.building.createList(3);
    });

    it('should return buildings', async () => {
      const actual = await buildingRepository.find();

      expect(actual).toIncludeAllMembers(buildings);
    });

    it('should filter by id', async () => {
      const slice = buildings.slice(0, 2);

      const actual = await buildingRepository.find({
        filters: {
          id: slice.map((building) => building.id)
        }
      });

      expect(actual).toHaveLength(slice.length);
      expect(actual).toIncludeSameMembers(slice);
    });
  });

  describe('get', () => {
    let building: BuildingApi;

    beforeAll(async () => {
      building = await factories.building.create();
    });

    it('should return null if the building is missing', async () => {
      const actual = await buildingRepository.get(faker.string.sample());

      expect(actual).toBeNull();
    });

    it('should return the building otherwise', async () => {
      const actual = await buildingRepository.get(building.id);

      expect(actual).toStrictEqual(building);
    });
  });

  describe('save', () => {
    it('should create a building if it does not exist', async () => {
      const building = genBuildingApi();

      await buildingRepository.save(building);

      const actual = await kysely
        .selectFrom('buildings')
        .selectAll('buildings')
        .where('id', '=', building.id)
        .executeTakeFirst();
      expect(actual).toBeDefined();
    });

    it('should update a building if it exists', async () => {
      const building = await factories.building.create();

      await buildingRepository.save({
        ...building,
        housingCount: 10
      });

      const actual = await kysely
        .selectFrom('buildings')
        .selectAll('buildings')
        .where('id', '=', building.id)
        .executeTakeFirst();
      expect(actual?.housingCount).toBe(10);
    });

    it('should update only the chosen properties', async () => {
      // factories.building relies on the shared @zerologementvacant/factories
      // generator, which does not expose a knob to force a non-null `rnb` —
      // so this case keeps genBuildingApi()'s `hasEnergyConsumption` option
      // and inserts it directly via toBuildingInsert.
      const building = genBuildingApi({ hasEnergyConsumption: true });
      await kysely
        .insertInto('buildings')
        .values(toBuildingInsert(building))
        .execute();
      expect(building.rnb).not.toBeNull();

      await buildingRepository.save(
        {
          ...building,
          housingCount: 10,
          rnb: null
        },
        {
          onConflict: ['id'],
          merge: ['housing_count']
        }
      );

      const actual = await kysely
        .selectFrom('buildings')
        .selectAll('buildings')
        .where('id', '=', building.id)
        .executeTakeFirst();
      expect(actual?.housingCount).toBe(10);
      expect(actual?.rnbId).toBe(building.rnb!.id);
    });
  });
});
