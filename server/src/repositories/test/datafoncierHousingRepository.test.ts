import type { DatafoncierHousing } from '@zerologementvacant/models';

import db from '~/infra/database';
import createDatafoncierHousingRepository, {
  DatafoncierHouses
} from '~/repositories/datafoncierHousingRepository';
import { genDatafoncierHousing } from '~/test/testFixtures';

describe('DatafoncierHousingRepository', () => {
  const repository = createDatafoncierHousingRepository();

  describe('findOne', () => {
    it('should find an existing datafoncier housing', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      await DatafoncierHouses().insert({
        ...datafoncierHousing,
        ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
          datafoncierHousing.ban_geom
        ]),
        geomloc: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomloc]),
        geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
      });

      const actual = await repository.findOne({
        idlocal: datafoncierHousing.idlocal
      });

      expect(actual).toMatchObject<Partial<DatafoncierHousing>>({
        ban_geom: datafoncierHousing.ban_geom,
        geomloc: datafoncierHousing.geomloc,
        geomrnb: datafoncierHousing.geomrnb
      });
    });
  });
});
