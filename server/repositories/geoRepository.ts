import db from './db';
import { Geometry } from 'geojson';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';

export const geoPerimetersTable = 'geo_perimeters';

const get = async (geoPerimeterId: string): Promise<GeoPerimeterApi> => {
  try {
    return db(geoPerimetersTable)
      .where('id', geoPerimeterId)
      .first()
      .then((result) => {
        if (result) {
          return parseGeoPerimeterApi(result);
        } else {
          console.error('Geo perimeter not found for id', geoPerimeterId);
          throw Error('Geo perimeter not found');
        }
      });
  } catch (err) {
    console.error('Getting geo perimeter failed', err, geoPerimeterId);
    throw new Error('Getting geo perimeter failed');
  }
};

const insert = async (
  geometry: Geometry,
  establishmentId: string,
  kind: string,
  name: string,
  createdBy?: string
): Promise<any> => {
  const rawGeom =
    geometry.type === 'LineString' || geometry.type === 'MultiLineString'
      ? 'st_multi(st_concaveHull(st_geomfromgeojson(?), 0.80))'
      : 'st_multi(st_geomfromgeojson(?))';

  console.log('Insert geo perimeter', establishmentId, kind, name);
  try {
    return db(geoPerimetersTable)
      .insert(
        db.raw(
          `(kind, name, geom, establishment_id, created_by) values (?, ?, ${rawGeom}, ?, ?)`,
          [
            kind,
            name,
            JSON.stringify(geometry),
            establishmentId,
            createdBy ?? '',
          ]
        )
      )
      .returning('*');
  } catch (err) {
    console.error('Inserting geo perimeter failed', err, establishmentId);
    throw new Error('Inserting geo perimeter failed');
  }
};

const update = async (
  geoPerimeterId: string,
  kind: string,
  name?: string
): Promise<GeoPerimeterApi> => {
  try {
    return db(geoPerimetersTable)
      .where('id', geoPerimeterId)
      .update({ kind, name });
  } catch (err) {
    console.error('Updating geo perimeter failed', err, geoPerimeterId);
    throw new Error('Updating geo perimeter failed');
  }
};

const listGeoPerimeters = async (
  establishmentId: string
): Promise<GeoPerimeterApi[]> => {
  try {
    return db(geoPerimetersTable)
      .select('*', db.raw('st_asgeojson(geom)::jsonb as geo_json'))
      .where('establishment_id', establishmentId)
      .orWhereNull('establishment_id')
      .orderBy('kind')
      .then((_) => _.map((_) => parseGeoPerimeterApi(_)));
  } catch (err) {
    console.error('Listing geo perimeter failed', err);
    throw new Error('Listing geo perimeter failed');
  }
};

const deleteGeoPerimeter = async (geoPerimeterId: string): Promise<number> => {
  try {
    return db(geoPerimetersTable).where('id', geoPerimeterId).delete();
  } catch (err) {
    console.error('Deleting geo perimeter failed', err, geoPerimeterId);
    throw new Error('Deleting geo perimeter failed');
  }
};

const formatGeoPerimeterApi = (geoPerimeterApi: GeoPerimeterApi) => ({
  id: geoPerimeterApi.id,
  establishment_id: geoPerimeterApi.establishmentId,
  name: geoPerimeterApi.name,
  kind: geoPerimeterApi.kind,
});

const parseGeoPerimeterApi = (result: any) =>
  <GeoPerimeterApi>{
    id: result.id,
    establishmentId: result.establishment_id,
    name: result.name,
    kind: result.kind,
    geoJson: result.geo_json,
  };

export default {
  get,
  insert,
  update,
  listGeoPerimeters,
  deleteGeoPerimeter,
  formatGeoPerimeterApi,
  parseGeoPerimeterApi,
};
