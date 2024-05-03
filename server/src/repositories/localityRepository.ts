import db from '~/infra/database';
import { LocalityApi, TaxKindsApi } from '~/models/LocalityApi';
import { logger } from '~/infra/logger';
import { LocalityKind } from '@zerologementvacant/shared';
import { establishmentsLocalitiesTable } from './establishmentLocalityRepository';

export const localitiesTable = 'localities';
export const Localities = (transaction = db) =>
  transaction<LocalityDBO>(localitiesTable);

async function get(geoCode: string): Promise<LocalityApi | null> {
  logger.info('Get LocalityApi with geoCode', geoCode);
  const locality = await db(localitiesTable).where('geo_code', geoCode).first();
  return locality ? parseLocalityApi(locality) : null;
}

async function listByEstablishmentId(
  establishmentId: string,
): Promise<LocalityApi[]> {
  return db(localitiesTable)
    .select(`${localitiesTable}.*`)
    .join(establishmentsLocalitiesTable, (join) => {
      join
        .onVal(
          `${establishmentsLocalitiesTable}.establishment_id`,
          establishmentId,
        )
        .andOn(
          `${establishmentsLocalitiesTable}.locality_id`,
          `${localitiesTable}.id`,
        );
    })
    .orderBy(`${localitiesTable}.name`)
    .then((_) => _.map((_: LocalityDBO) => parseLocalityApi(_)));
}

export interface LocalityDBO {
  id: string;
  geo_code: string;
  name: string;
  locality_kind?: string;
  tax_kind?: string;
  tax_rate?: number;
}

async function update(localityApi: LocalityApi): Promise<LocalityApi> {
  logger.info('Update localityApi with geoCode', localityApi.geoCode);

  const { geo_code, tax_rate, tax_kind } = formatLocalityApi(localityApi);
  return db(localitiesTable)
    .where('geo_code', geo_code)
    .update({ tax_rate: tax_rate ?? db.raw('null'), tax_kind })
    .returning('*')
    .then((_) => parseLocalityApi(_[0]));
}

export const formatLocalityApi = (localityApi: LocalityApi): LocalityDBO => ({
  id: localityApi.id,
  geo_code: localityApi.geoCode,
  name: localityApi.name,
  locality_kind: localityApi.kind,
  tax_kind: localityApi.taxKind,
  tax_rate: localityApi.taxRate,
});

export const parseLocalityApi = (localityDbo: LocalityDBO): LocalityApi => ({
  id: localityDbo.id,
  geoCode: localityDbo.geo_code,
  name: localityDbo.name,
  kind: localityDbo.locality_kind as LocalityKind,
  taxKind: localityDbo.tax_kind as TaxKindsApi,
  taxRate: localityDbo.tax_rate,
});

export default {
  get,
  listByEstablishmentId,
  formatLocalityApi,
  update,
};
