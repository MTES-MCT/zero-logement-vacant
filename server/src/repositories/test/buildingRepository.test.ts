import buildingRepository, {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import { genBuildingApi, genHousingApi } from '~/test/testFixtures';

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

    it('should update only the chosen properties', async () => {
      const building = genBuildingApi(housings);
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
