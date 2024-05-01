import * as turf from '@turf/turf';
import { Geometry } from 'geojson';

import db from './db';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';
import { logger } from '../utils/logger';

export const geoPerimetersTable = 'geo_perimeters';
export const GeoPerimeters = (transaction = db) =>
  transaction<GeoPerimeterDBO>(geoPerimetersTable);

interface FindOptions {
  filters?: {
    establishmentId?: string;
  };
}

const SELECT_FIELDS = [
  'id',
  'name',
  'kind',
  'establishment_id',
  db.raw('ST_AsGeoJSON(geom)::jsonb AS geom'),
];

async function find(opts?: FindOptions): Promise<GeoPerimeterApi[]> {
  logger.debug('Finding perimeters...', opts);

  const perimeters: GeoPerimeterDBO[] = await GeoPerimeters()
    .select(...SELECT_FIELDS)
    .modify((query) => {
      if (opts?.filters?.establishmentId) {
        query.where('establishment_id', opts.filters.establishmentId);
      }
    })
    .orderBy('name');

  logger.info(`Found ${perimeters.length} perimeters`);
  return perimeters.map(parseGeoPerimeterApi);
}

async function get(id: string): Promise<GeoPerimeterApi | null> {
  logger.debug('Getting perimeter by id...', { id });
  const geoPerimeter: GeoPerimeterDBO | undefined = await GeoPerimeters()
    .select(...SELECT_FIELDS)
    .where('id', id)
    .first();

  if (!geoPerimeter) {
    return null;
  }

  logger.info('Got perimeter', { id });
  return parseGeoPerimeterApi(geoPerimeter);
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
    name,
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
  logger.debug('Removing perimeters...', {
    perimeters: geoPerimeterIds,
    establishment: establishmentId,
  });
  await db(geoPerimetersTable)
    .whereIn('id', geoPerimeterIds)
    .andWhere('establishment_id', establishmentId)
    .delete();
  logger.info('Removed perimeters', {
    perimeters: geoPerimeterIds,
    establishment: establishmentId,
  });
}

export interface GeoPerimeterDBO {
  id: string;
  establishment_id: string;
  name: string;
  kind: string;
  geom?: turf.MultiPolygon;
}

export const formatGeoPerimeterApi = (
  perimeter: GeoPerimeterApi
): GeoPerimeterDBO => ({
  id: perimeter.id,
  establishment_id: perimeter.establishmentId,
  name: perimeter.name,
  kind: perimeter.kind,
  geom: perimeter.geoJson,
});

export const parseGeoPerimeterApi = (
  perimeter: GeoPerimeterDBO
): GeoPerimeterApi => ({
  id: perimeter.id,
  establishmentId: perimeter.establishment_id,
  name: perimeter.name,
  kind: perimeter.kind,
  geoJson: perimeter.geom,
});

export default {
  find,
  get,
  insert,
  update,
  removeMany,
};
