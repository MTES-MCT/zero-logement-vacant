import type { DatafoncierHousing } from '@zerologementvacant/models';
import { genIdprocpte } from '@zerologementvacant/models/fixtures';

import db from '~/infra/database';
import createDatafoncierHousingRepository, {
  DatafoncierHouses
} from '~/repositories/datafoncierHousingRepository';
import { genBuildingApi, genDatafoncierHousing } from '~/test/testFixtures';

import { Buildings, formatBuildingApi } from '../buildingRepository';

describe('DatafoncierHousingRepository', () => {
  const repository = createDatafoncierHousingRepository();

  describe('findOne', () => {
    it('should find an existing datafoncier housing', async () => {
      const idprocpte = genIdprocpte();
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      await Buildings().insert(formatBuildingApi(building));
      await DatafoncierHouses().insert({
        ...datafoncierHousing,
        ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.ban_geom)
        ]),
        geomloc: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.geomloc)
        ]),
        geomrnb: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.geomrnb)
        ])
      });

      const actual = await repository.findOne({
        idlocal: datafoncierHousing.idlocal
      });

      // Full-object comparison (not just the geometry fields) — guards
      // against camelCase/snake_case key drift across every one of the
      // ~130 other columns, not just the ones explicitly asserted below.
      expect(actual).toEqual(datafoncierHousing);
      expect(actual).toMatchObject<Partial<DatafoncierHousing>>({
        ban_geom: datafoncierHousing.ban_geom,
        geomloc: datafoncierHousing.geomloc,
        geomrnb: datafoncierHousing.geomrnb
      });
    });

    it('should return null if no datafoncier housing matches', async () => {
      const actual = await repository.findOne({
        idlocal: genIdprocpte()
      });

      expect(actual).toBeNull();
    });
  });

  describe('find', () => {
    it('should return datafoncier housings matching the idlocal filter', async () => {
      const idprocpte = genIdprocpte();
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      await Buildings().insert(formatBuildingApi(building));
      await DatafoncierHouses().insert({
        ...datafoncierHousing,
        ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.ban_geom)
        ]),
        geomloc: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.geomloc)
        ]),
        geomrnb: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.geomrnb)
        ])
      });

      const actual = await repository.find({
        idlocal: datafoncierHousing.idlocal
      });

      expect(actual).toSatisfyAll<DatafoncierHousing>(
        (housing) => housing.idlocal === datafoncierHousing.idlocal
      );
      expect(actual.length).toBeGreaterThanOrEqual(1);
    });

    it('should return an empty array if no datafoncier housing matches', async () => {
      const actual = await repository.find({ idlocal: genIdprocpte() });

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return datafoncier housings when called without a filter', async () => {
      const idprocpte = genIdprocpte();
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      await Buildings().insert(formatBuildingApi(building));
      await DatafoncierHouses().insert({
        ...datafoncierHousing,
        ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.ban_geom)
        ]),
        geomloc: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.geomloc)
        ]),
        geomrnb: db.raw('ST_GeomFromGeoJson(?)', [
          JSON.stringify(datafoncierHousing.geomrnb)
        ])
      });

      const actual = await repository.find();

      const idlocals = actual.map((housing) => housing.idlocal);
      expect(idlocals).toContain(datafoncierHousing.idlocal);
    });
  });
});
