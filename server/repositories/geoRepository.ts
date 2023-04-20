import db from './db';
import { GeoJSON, Geometry } from 'geojson';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';

export const geoPerimetersTable = 'geo_perimeters';

const GeoPerimeters = () => db<GeoPerimeterDbo>(geoPerimetersTable);

const get = async (geoPerimeterId: string): Promise<GeoPerimeterApi | null> => {
  console.log('Get GeoPerimeter with id', geoPerimeterId);
  const geoPerimeter = await GeoPerimeters()
    .where('id', geoPerimeterId)
    .first();
  return geoPerimeter ? parseGeoPerimeterApi(geoPerimeter) : null;
};

const insert = async (
  geometry: Geometry,
  establishmentId: string,
  kind: string,
  name: string,
  createdBy?: string
): Promise<void> => {
  const rawGeom =
    geometry.type === 'LineString' || geometry.type === 'MultiLineString'
      ? 'st_multi(st_concaveHull(st_geomfromgeojson(?), 0.80))'
      : 'st_multi(st_geomfromgeojson(?))';

  console.log('Insert geo perimeter', establishmentId, kind, name);
  await db(geoPerimetersTable).insert(
    db.raw(
      `(kind, name, geom, establishment_id, created_by) values (?, ?, ${rawGeom}, ?, ?)`,
      [kind, name, JSON.stringify(geometry), establishmentId, createdBy ?? '']
    )
  );
};

const update = async (geoPerimeterApi: GeoPerimeterApi): Promise<void> => {
  console.log('Update geoPerimeterApi with id', geoPerimeterApi.id);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, establishment_id, geo_json, ...updatedData } =
    formatGeoPerimeterApi(geoPerimeterApi);

  await GeoPerimeters().where({ id: geoPerimeterApi.id }).update(updatedData);
};

const find = async (establishmentId: string): Promise<GeoPerimeterApi[]> => {
  console.log(
    'List geoPerimeterApi for establishment with id',
    establishmentId
  );

  const geoPerimeters = await GeoPerimeters()
    .select('*', db.raw('st_asgeojson(geom)::jsonb as geo_json'))
    .where('establishment_id', establishmentId)
    .orWhereNull('establishment_id')
    .orderBy('name');
  return geoPerimeters.map(parseGeoPerimeterApi);
};

const removeMany = async (
  geoPerimeterIds: string[],
  establishmentId: string
): Promise<void> => {
  console.log(
    'Remove geoPerimeters with ids %s into establishment',
    geoPerimeterIds,
    establishmentId
  );
  await db(geoPerimetersTable)
    .whereIn('id', geoPerimeterIds)
    .andWhere('establishment_id', establishmentId)
    .delete();
};

interface GeoPerimeterDbo {
  id: string;
  establishment_id: string;
  name: string;
  kind: string;
  geo_json?: GeoJSON;
}

const formatGeoPerimeterApi = (
  geoPerimeterApi: GeoPerimeterApi
): GeoPerimeterDbo => ({
  id: geoPerimeterApi.id,
  establishment_id: geoPerimeterApi.establishmentId,
  name: geoPerimeterApi.name,
  kind: geoPerimeterApi.kind,
});

const parseGeoPerimeterApi = (
  geoPerimeterDbo: GeoPerimeterDbo
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
  formatGeoPerimeterApi,
  parseGeoPerimeterApi,
};
