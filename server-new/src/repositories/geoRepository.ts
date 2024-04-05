import db from '~/infra/database';
import { GeoJSON, Geometry } from 'geojson';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { logger } from '~/infra/logger';

export const geoPerimetersTable = 'geo_perimeters';
export const GeoPerimeters = (transaction = db) =>
  transaction<GeoPerimeterDBO>(geoPerimetersTable);

async function get(id: string): Promise<GeoPerimeterApi | null> {
  logger.info('Get GeoPerimeter with id', id);
  const geoPerimeter = await GeoPerimeters().where('id', id).first();
  return geoPerimeter ? parseGeoPerimeterApi(geoPerimeter) : null;
}

async function insert(
  geometry: Geometry,
  establishmentId: string,
  kind: string,
  name: string,
  createdBy?: string,
): Promise<void> {
  const rawGeom =
    geometry.type === 'LineString' || geometry.type === 'MultiLineString'
      ? 'st_multi(st_concaveHull(st_geomfromgeojson(?), 0.80))'
      : 'st_multi(st_geomfromgeojson(?))';

  logger.info('Insert geo perimeter', {
    establishment: establishmentId,
    kind,
    name,
  });
  await db(geoPerimetersTable).insert(
    db.raw(
      `(kind, name, geom, establishment_id, created_by) values (?, ?, ${rawGeom}, ?, ?)`,
      [kind, name, JSON.stringify(geometry), establishmentId, createdBy ?? ''],
    ),
  );
}

async function update(geoPerimeterApi: GeoPerimeterApi): Promise<void> {
  logger.info('Update geoPerimeterApi with id', geoPerimeterApi.id);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, establishment_id, geo_json, ...updatedData } =
    formatGeoPerimeterApi(geoPerimeterApi);

  await GeoPerimeters().where({ id: geoPerimeterApi.id }).update(updatedData);
}

async function find(establishmentId: string): Promise<GeoPerimeterApi[]> {
  logger.info(
    'List geoPerimeterApi for establishment with id',
    establishmentId,
  );

  const geoPerimeters = await GeoPerimeters()
    .select('*', db.raw('st_asgeojson(geom)::jsonb as geo_json'))
    .where('establishment_id', establishmentId)
    .orWhereNull('establishment_id')
    .orderBy('name');
  return geoPerimeters.map(parseGeoPerimeterApi);
}

async function removeMany(
  geoPerimeterIds: string[],
  establishmentId: string,
): Promise<void> {
  logger.info('Remove geoPerimeters with ids %s into establishment', {
    geoPerimeter: geoPerimeterIds,
    establishment: establishmentId,
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
  geo_json?: GeoJSON;
}

export const formatGeoPerimeterApi = (
  geoPerimeterApi: GeoPerimeterApi,
): GeoPerimeterDBO => ({
  id: geoPerimeterApi.id,
  establishment_id: geoPerimeterApi.establishmentId,
  name: geoPerimeterApi.name,
  kind: geoPerimeterApi.kind,
});

export const parseGeoPerimeterApi = (
  geoPerimeterDbo: GeoPerimeterDBO,
): GeoPerimeterApi => ({
  id: geoPerimeterDbo.id,
  establishmentId: geoPerimeterDbo.establishment_id,
  name: geoPerimeterDbo.name,
  kind: geoPerimeterDbo.kind,
  geoJson: geoPerimeterDbo.geo_json,
});

export default {
  get,
  insert,
  update,
  find,
  removeMany,
};
