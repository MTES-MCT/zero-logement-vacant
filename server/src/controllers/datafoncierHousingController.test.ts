import { constants } from 'http2';

import { faker } from '@faker-js/faker';
import type { DatafoncierHousing } from '@zerologementvacant/models';
import {
  genDatafoncierHousing,
  genGeoCode,
  genIdprocpte
} from '@zerologementvacant/models/fixtures';
import { sql } from 'kysely';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { tokenProvider } from '~/test/testUtils';

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

describe('Datafoncier housing controller', () => {
  let url: string;
  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    url = await createServer().testing();
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('findOne', () => {
    const testRoute = (localId: string) => `/datafoncier/housing/${localId}`;

    it('should return the housing if it exists', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = await factories.building.create();
      const housing = genDatafoncierHousing(idprocpte, building.id);
      await insertDatafoncierHousing(housing);

      const { body, status } = await request(url)
        .get(testRoute(housing.idlocal))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" if the given local id does not belong to the user’s establishment', async () => {
      let geoCode = genGeoCode();
      while (establishment.geoCodes.includes(geoCode)) {
        geoCode = genGeoCode();
      }
      const idprocpte = genIdprocpte(geoCode);
      const building = await factories.building.create();
      const housing = genDatafoncierHousing(idprocpte, building.id);
      await insertDatafoncierHousing(housing);

      const { status } = await request(url)
        .get(testRoute(housing.idlocal))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return "not found" otherwise', async () => {
      const { status } = await request(url)
        .get(testRoute('missing'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
