import { faker } from '@faker-js/faker/locale/fr';
import buildingRepository, {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import { genBuildingApi } from '~/test/testFixtures';

describe('Building repository', () => {
  describe('find', () => {
    const buildings = faker.helpers.multiple(genBuildingApi);

    beforeAll(async () => {
      await Buildings().insert(buildings.map(formatBuildingApi));
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
    const building = genBuildingApi();

    beforeAll(async () => {
      await Buildings().insert(formatBuildingApi(building));
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

      const actual = await Buildings().where({ id: building.id }).first();
      expect(actual).toBeDefined();
    });

    it('should update a building if it exists', async () => {
      const building = genBuildingApi();
      await Buildings().insert(formatBuildingApi(building));

      await buildingRepository.save({
        ...building,
        housingCount: 10
      });

      const actual = await Buildings().where({ id: building.id }).first();
      expect(actual?.housing_count).toBe(10);
    });

    it('should update only the chosen properties', async () => {
      const building = genBuildingApi();
      await Buildings().insert(formatBuildingApi(building));
      expect(building.rnbId).not.toBeNull();

      await buildingRepository.save(
        {
          ...building,
          housingCount: 10,
          rnbId: null
        },
        {
          onConflict: ['id'],
          merge: ['housing_count']
        }
      );

      const actual = await Buildings().where({ id: building.id }).first();
      expect(actual?.housing_count).toBe(10);
      expect(actual?.rnb_id).toBe(building.rnbId);
    });
  });
});
