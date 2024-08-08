import { genBuildingApi, genHousingApi } from '~/test/testFixtures';
import buildingRepository, {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';

describe('Building repository', () => {
  describe('save', () => {
    const housings = Array.from({ length: 10 }, () => genHousingApi());

    it('should create a building if it does not exist', async () => {
      const building = genBuildingApi(housings);

      await buildingRepository.save(building);

      const actual = await Buildings().where({ id: building.id }).first();
      expect(actual).toBeDefined();
    });

    it('should update a building if it exists', async () => {
      const building = genBuildingApi(housings);
      await Buildings().insert(formatBuildingApi(building));

      await buildingRepository.save({
        ...building,
        housingCount: 10
      });

      const actual = await Buildings().where({ id: building.id }).first();
      expect(actual?.housing_count).toBe(10);
    });
  });
});
