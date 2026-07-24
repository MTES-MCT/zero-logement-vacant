import type { MultiPolygon } from 'geojson';
import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';

export const geoPerimetersTable = 'geo_perimeters';
export const GeoPerimeters = (transaction = db) =>
  transaction<GeoPerimeterDBO>(geoPerimetersTable);

async function find(establishmentId: string): Promise<GeoPerimeterApi[]> {
  logger.debug('Finding perimeters...', {
    establishment: establishmentId
  });

  const rows = await kysely
    .selectFrom('geoPerimeters')
    .selectAll()
    .select(sql<MultiPolygon>`st_asgeojson(geom)::jsonb`.as('geomJson'))
    .where((eb) =>
      eb.or([
        eb('establishmentId', '=', establishmentId),
        eb('establishmentId', 'is', null)
      ])
    )
    .orderBy('name')
    .execute();

  logger.debug('Found perimeters.', {
    establishment: establishmentId,
    perimeters: rows.length
  });
  return rows.map(parseGeoPerimeterRow);
}

async function get(id: string): Promise<GeoPerimeterApi | null> {
  logger.info('Get GeoPerimeter with id', id);
  // Deliberately no st_asgeojson transform here, unlike find() — matches
  // the pre-migration behavior exactly (a known, pre-existing bug: `geometry`
  // comes back as a raw PostGIS string here, not valid GeoJSON; not fixed by
  // this migration — see the Phase 2 plan doc).
  const row = await kysely
    .selectFrom('geoPerimeters')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  return row ? parseGeoPerimeterRow(row) : null;
}

async function save(perimeter: GeoPerimeterApi): Promise<void> {
  logger.debug('Saving perimeter...', { perimeter });
  await kysely
    .insertInto('geoPerimeters')
    .values({
      id: perimeter.id,
      establishmentId: perimeter.establishmentId,
      name: perimeter.name,
      kind: perimeter.kind,
      // PostGIS accepts an implicit cast from GeoJSON text to `geometry`
      // (verified empirically) — same as the original Knex path, which
      // relied on the pg driver's automatic JSON.stringify of an object
      // bind parameter producing the same text.
      geom: JSON.stringify(perimeter.geometry),
      createdAt: new Date(perimeter.createdAt),
      createdBy: perimeter.createdBy
    })
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        geom: eb.ref('excluded.geom'),
        name: eb.ref('excluded.name'),
        kind: eb.ref('excluded.kind')
      }))
    )
    .execute();
  logger.debug('Saved perimeter.', { perimeter });
}

async function update(geoPerimeterApi: GeoPerimeterApi): Promise<void> {
  logger.info('Update geoPerimeterApi with id', geoPerimeterApi.id);

  // Excludes id/establishmentId/geometry, matching the original's
  // destructure-and-drop of id/establishment_id/geom.
  await kysely
    .updateTable('geoPerimeters')
    .set({
      name: geoPerimeterApi.name,
      kind: geoPerimeterApi.kind,
      createdAt: new Date(geoPerimeterApi.createdAt),
      createdBy: geoPerimeterApi.createdBy
    })
    .where('id', '=', geoPerimeterApi.id)
    .execute();
}

async function removeMany(
  geoPerimeterIds: string[],
  establishmentId: string
): Promise<void> {
  logger.info('Remove geoPerimeters with ids %s into establishment', {
    geoPerimeter: geoPerimeterIds,
    establishment: establishmentId
  });
  await kysely
    .deleteFrom('geoPerimeters')
    .where('id', 'in', geoPerimeterIds)
    .where('establishmentId', '=', establishmentId)
    .execute();
}

export interface GeoPerimeterDBO {
  id: string;
  establishment_id: string;
  name: string;
  kind: string;
  geom: MultiPolygon;
  created_at: Date | string;
  created_by: string;
}

export const formatGeoPerimeterApi = (
  perimeter: GeoPerimeterApi
): GeoPerimeterDBO => ({
  id: perimeter.id,
  establishment_id: perimeter.establishmentId,
  geom: perimeter.geometry,
  name: perimeter.name,
  kind: perimeter.kind,
  created_at: perimeter.createdAt,
  created_by: perimeter.createdBy
});

type GeoPerimeterRow = Selectable<DB['geoPerimeters']> & {
  geomJson?: MultiPolygon;
};

function parseGeoPerimeterRow(row: GeoPerimeterRow): GeoPerimeterApi {
  return {
    id: row.id,
    establishmentId: row.establishmentId as string,
    name: row.name as string,
    kind: row.kind as string,
    // find() selects geomJson (proper GeoJSON); get() doesn't, so this
    // falls through to the raw `geom` string — preserving get()'s bug.
    geometry: (row.geomJson ?? row.geom) as unknown as MultiPolygon,
    createdAt: new Date(row.createdAt as unknown as string).toJSON(),
    createdBy: row.createdBy as string
  };
}

export default {
  find,
  get,
  save,
  update,
  removeMany
};
