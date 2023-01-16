import db from './db';
import { establishmentsTable } from './establishmentRepository';
import { LocalityApi } from '../models/LocalityApi';

export const localitiesTable = 'localities';

const listByEstablishmentId = async (
  establishmentId: string
): Promise<LocalityApi[]> => {
  return db(localitiesTable)
    .joinRaw(
      `join ${establishmentsTable} as e on (${localitiesTable}.geo_code = any(e.localities_geo_code))`
    )
    .where('e.id', establishmentId)
    .then((_) => _.map((_: LocalityDbo) => parseLocalityApi(_)));
};

export interface LocalityDbo {
  id?: string;
  geo_code: string;
  name: string;
  tax_zone?: string;
  tax_rate?: number;
}

const formatLocalityApi = (localityApi: LocalityApi): LocalityDbo => ({
  geo_code: localityApi.geoCode,
  name: localityApi.name,
  tax_zone: localityApi.taxZone,
  tax_rate: localityApi.taxRate,
});

const parseLocalityApi = (localityDbo: LocalityDbo) =>
  <LocalityApi>{
    geoCode: localityDbo.geo_code,
    name: localityDbo.name,
    taxZone: localityDbo.tax_zone,
    taxRate: localityDbo.tax_rate,
  };

export default {
  listByEstablishmentId,
  formatLocalityApi,
};
