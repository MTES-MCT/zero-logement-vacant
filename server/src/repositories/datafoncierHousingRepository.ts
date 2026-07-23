import { DatafoncierHousing } from '@zerologementvacant/models';
import { Record } from 'effect';
import { camelToSnake } from 'effect/String';
import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';

export const datafoncierHousingTable = 'df_housing_nat_2024';
export const DatafoncierHouses = (transaction = db) =>
  transaction<DatafoncierHousing>(datafoncierHousingTable);

interface DatafoncierHousingFilters {
  idlocal?: string;
  /**
   * @deprecated typo'd — the real column/field is `idprocpte`. No caller has
   * ever passed this (only `idlocal` is used in practice), so it is kept in
   * the type for API compatibility but is not wired to any query. Before
   * this migration, passing it would have crashed with a Postgres
   * "column idpropcte does not exist" error (Knex's `.where(object)` treats
   * object keys as literal column names); this is now a silent no-op
   * instead — a deliberate simplification of an unreachable, dead path.
   */
  idpropcte?: string;
}

class DatafoncierHousingRepository {
  async find(where?: DatafoncierHousingFilters): Promise<DatafoncierHousing[]> {
    const rows = await list()
      .$if(where?.idlocal !== undefined, (query) =>
        query.where('idlocal', '=', where?.idlocal ?? '')
      )
      .execute();
    return rows.map(parseDatafoncierHousingRow);
  }

  async findOne(
    where: DatafoncierHousingFilters
  ): Promise<DatafoncierHousing | null> {
    const row = await list()
      .$if(where.idlocal !== undefined, (query) =>
        query.where('idlocal', '=', where.idlocal ?? '')
      )
      .executeTakeFirst();
    return row ? parseDatafoncierHousingRow(row) : null;
  }
}

function list() {
  return (
    kysely
      // CamelCasePlugin's runtime snake_case conversion of 'dfHousingNat2024'
      // produces 'df_housing_nat2024' (no underscore before the digits),
      // which doesn't match the real table `df_housing_nat_2024` — the
      // kysely-codegen type key doesn't round-trip through the plugin (a
      // known limitation for identifiers with a segment boundary right
      // before a digit run). Pass a raw, correctly-spelled table reference
      // at runtime, told to TypeScript as the typed key so column selects
      // still resolve against the real `dfHousingNat2024` schema.
      .selectFrom(
        sql`df_housing_nat_2024`.as(
          'dfHousingNat2024'
        ) as unknown as 'dfHousingNat2024'
      )
      .selectAll()
      // CamelCasePlugin also camelCases result aliases, so a snake_case
      // .as('ban_geom_json') would come back as `banGeomJson` — alias in
      // camelCase directly to avoid the mismatch.
      .select(
        sql<string>`ST_AsGeoJson(ST_Transform(ban_geom, 4326))::json`.as(
          'banGeomJson'
        )
      )
      .select(
        sql<string>`ST_AsGeoJson(ST_Transform(geomloc, 4326))::json`.as(
          'geomlocJson'
        )
      )
      .select(
        sql<string>`ST_AsGeoJson(ST_Transform(geomrnb, 4326))::json`.as(
          'geomrnbJson'
        )
      )
      .where('dteloctxt', 'in', ['APPARTEMENT', 'MAISON'])
  );
}

type DatafoncierHousingRow = Selectable<DB['dfHousingNat2024']> & {
  // Postgres `::json` casts are auto-parsed into JS objects by the pg
  // driver — do not JSON.parse these.
  banGeomJson: unknown;
  geomlocJson: unknown;
  geomrnbJson: unknown;
};

function parseDatafoncierHousingRow(
  row: DatafoncierHousingRow
): DatafoncierHousing {
  // banGeom is the raw (untransformed) geometry column from selectAll() —
  // drop it along with the *Json intermediates so only the GeoJSON-
  // transformed ban_geom/geomloc/geomrnb survive, matching the original
  // Knex query's column-shadowing behavior. Every other column comes back
  // camelCased by CamelCasePlugin, but DatafoncierHousing (and every
  // caller) expects the raw snake_case DB shape Knex used to return —
  // convert back generically rather than hand-mapping ~130 fields.
  const {
    banGeom: _banGeom,
    banGeomJson,
    geomlocJson,
    geomrnbJson,
    ...rest
  } = row;
  const snakeCased = Record.mapKeys(rest, camelToSnake);
  return {
    ...snakeCased,
    ban_geom: banGeomJson,
    geomloc: geomlocJson,
    geomrnb: geomrnbJson
  } as unknown as DatafoncierHousing;
}

function createDatafoncierHousingRepository() {
  return new DatafoncierHousingRepository();
}

export default createDatafoncierHousingRepository;
