import type { DatafoncierHousing } from '@zerologementvacant/models';
import { genIdprocpte } from '@zerologementvacant/models/fixtures';
import { sql } from 'kysely';

import { kysely } from '~/infra/database/kysely';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import { factories } from '~/test/factories';
import { genDatafoncierHousing } from '~/test/testFixtures';

// Kysely raw insert for df_housing_nat_2024: the codegen key `dfHousingNat2024`
// doesn't round-trip through CamelCasePlugin to the real table name, and
// insertInto() only accepts a literal table key — so build the statement with a
// literal table reference and ST_GeomFromGeoJson() for the PostGIS columns.
async function insertDatafoncierHousing(
  datafoncierHousing: DatafoncierHousing
): Promise<void> {
  const { ban_geom, geomloc, geomrnb, ...rest } = datafoncierHousing;
  const columns = Object.keys(rest);
  const columnRefs = [...columns, 'ban_geom', 'geomloc', 'geomrnb'].map(
    (column) => sql.ref(column)
  );
  const values = [
    ...columns.map(
      (column) => sql`${(rest as Record<string, unknown>)[column]}`
    ),
    sql`ST_GeomFromGeoJson(${JSON.stringify(ban_geom)})`,
    sql`ST_GeomFromGeoJson(${JSON.stringify(geomloc)})`,
    sql`ST_GeomFromGeoJson(${JSON.stringify(geomrnb)})`
  ];
  await sql`
    insert into df_housing_nat_2024 (${sql.join(columnRefs)})
    values (${sql.join(values)})
  `.execute(kysely);
}

describe('DatafoncierHousingRepository', () => {
  const repository = createDatafoncierHousingRepository();

  describe('findOne', () => {
    it('should find an existing datafoncier housing', async () => {
      const idprocpte = genIdprocpte();
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      await insertDatafoncierHousing(datafoncierHousing);

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
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      await insertDatafoncierHousing(datafoncierHousing);

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
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      await insertDatafoncierHousing(datafoncierHousing);

      const actual = await repository.find();

      const idlocals = actual.map((housing) => housing.idlocal);
      expect(idlocals).toContain(datafoncierHousing.idlocal);
    });
  });
});
