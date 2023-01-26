import db from './db';
import { establishmentsTable } from './establishmentRepository';
import { LocalityApi } from '../models/LocalityApi';

export const localitiesTable = 'localities';

const get = async (geoCode: string): Promise<LocalityApi | null> => {
  console.log('Get LocalityApi with geoCode', geoCode);
  const locality = await db(localitiesTable).where('geo_code', geoCode).first();
  return locality ? parseLocalityApi(locality) : null;
};

const listByEstablishmentId = async (
  establishmentId: string
): Promise<LocalityApi[]> => {
  return db(localitiesTable)
    .select(`${localitiesTable}.*`)
    .joinRaw(
      `join ${establishmentsTable} as e on (${localitiesTable}.geo_code = any(e.localities_geo_code))`
    )
    .where('e.id', establishmentId)
    .orderBy(`${localitiesTable}.name`)
    .then((_) => _.map((_: LocalityDbo) => parseLocalityApi(_)));
};

export interface LocalityDbo {
  id?: string;
  geo_code: string;
  name: string;
  tax_kind?: string;
  tax_rate?: number;
}

const update = async (localityApi: LocalityApi): Promise<LocalityApi> => {
  console.log('Update localityApi with geoCode', localityApi.geoCode);

  const { geo_code, tax_rate, tax_kind } = formatLocalityApi(localityApi);
  return db(localitiesTable)
    .where('geo_code', geo_code)
    .update({ tax_rate: tax_rate ?? db.raw('null'), tax_kind })
    .returning('*')
    .then((_) => parseLocalityApi(_[0]));
};

const formatLocalityApi = (localityApi: LocalityApi): LocalityDbo => ({
  geo_code: localityApi.geoCode,
  name: localityApi.name,
  tax_kind: localityApi.taxKind,
  tax_rate: localityApi.taxRate,
});

const parseLocalityApi = (localityDbo: LocalityDbo) =>
  <LocalityApi>{
    geoCode: localityDbo.geo_code,
    name: localityDbo.name,
    taxKind: localityDbo.tax_kind,
    taxRate: localityDbo.tax_rate,
  };

export default {
  get,
  listByEstablishmentId,
  formatLocalityApi,
  update,
};
