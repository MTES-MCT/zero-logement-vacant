import type { Geometry, MultiPolygon } from 'geojson';

import db from '~/infra/database';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { logger } from '~/infra/logger';

export const geoPerimetersTable = 'geo_perimeters';
export const GeoPerimeters = (transaction = db) =>
  transaction<GeoPerimeterDBO>(geoPerimetersTable);

async function find(establishmentId: string): Promise<GeoPerimeterApi[]> {
  logger.debug('Finding perimeters...', {
    establishment: establishmentId
  });

  const geoPerimeters = await GeoPerimeters()
    .select('*', db.raw('st_asgeojson(geom)::jsonb as geom'))
    .where('establishment_id', establishmentId)
    .orWhereNull('establishment_id')
    .orderBy('name');
  logger.debug('Found perimeters.', {
    establishment: establishmentId,
    perimeters: geoPerimeters.length
  });
  return geoPerimeters.map(parseGeoPerimeterApi);
}

async function get(id: string): Promise<GeoPerimeterApi | null> {
  logger.info('Get GeoPerimeter with id', id);
  const geoPerimeter = await GeoPerimeters().where('id', id).first();
  return geoPerimeter ? parseGeoPerimeterApi(geoPerimeter) : null;
}

async function save(perimeter: GeoPerimeterApi): Promise<void> {
  logger.debug('Saving perimeter...', { perimeter });
  await GeoPerimeters()
    .insert(formatGeoPerimeterApi(perimeter))
    .onConflict('id')
    .merge(['geom', 'name', 'kind']);
  logger.debug('Saved perimeter.', { perimeter });
}

async function insert(
  geometry: Geometry,
  establishmentId: string,
  kind: string,
  name: string,
  createdBy?: string
): Promise<void> {
  const rawGeom =
    geometry.type === 'LineString' || geometry.type === 'MultiLineString'
      ? 'st_multi(st_concaveHull(st_geomfromgeojson(?), 0.80))'
      : 'st_multi(st_geomfromgeojson(?))';

  logger.info('Insert geo perimeter', {
    establishment: establishmentId,
    kind,
    name
  });
  await db(geoPerimetersTable).insert(
    db.raw(
      `(kind, name, geom, establishment_id, created_by) values (?, ?, ${rawGeom}, ?, ?)`,
      [kind, name, JSON.stringify(geometry), establishmentId, createdBy ?? '']
    )
  );
}

async function update(geoPerimeterApi: GeoPerimeterApi): Promise<void> {
  logger.info('Update geoPerimeterApi with id', geoPerimeterApi.id);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, establishment_id, geom, ...updatedData } =
    formatGeoPerimeterApi(geoPerimeterApi);

  await GeoPerimeters().where({ id: geoPerimeterApi.id }).update(updatedData);
}

async function removeMany(
  geoPerimeterIds: string[],
  establishmentId: string
): Promise<void> {
  logger.info('Remove geoPerimeters with ids %s into establishment', {
    geoPerimeter: geoPerimeterIds,
    establishment: establishmentId
  });
  await db(geoPerimetersTable)
    .whereIn('id', geoPerimeterIds)
    .andWhere('establishment_id', establishmentId)
    .delete();
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

export const parseGeoPerimeterApi = (
  perimeter: GeoPerimeterDBO
): GeoPerimeterApi => ({
  id: perimeter.id,
  establishmentId: perimeter.establishment_id,
  name: perimeter.name,
  kind: perimeter.kind,
  geometry: perimeter.geom,
  createdAt: new Date(perimeter.created_at).toJSON(),
  createdBy: perimeter.created_by
});

export default {
  find,
  get,
  save,
  insert,
  update,
  removeMany
};
