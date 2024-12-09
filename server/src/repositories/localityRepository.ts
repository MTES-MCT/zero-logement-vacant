import { Knex } from 'knex';

import { LocalityKind } from '@zerologementvacant/models';
import db from '~/infra/database';
import { LocalityApi, TaxKindsApi } from '~/models/LocalityApi';
import { createLogger } from '~/infra/logger';
import {
  Establishments,
  establishmentsTable
} from '~/repositories/establishmentRepository';

export const localitiesTable = 'localities';
export const Localities = (transaction = db) =>
  transaction<LocalityDBO>(localitiesTable);

const logger = createLogger('localityRepository');

interface LocalityFilters {
  establishmentId?: string;
}

interface FindOptions {
  filters?: LocalityFilters;
}

async function find(options: FindOptions): Promise<ReadonlyArray<LocalityApi>> {
  const localities = await Localities()
    .select(`${localitiesTable}.*`)
    .modify(filterQuery(options?.filters))
    .orderBy(`${localitiesTable}.name`);

  return localities.map(parseLocalityApi);
}

async function get(geoCode: string): Promise<LocalityApi | null> {
  logger.debug('Get locality', { geoCode });
  const locality = await Localities().where({ geo_code: geoCode }).first();
  return locality ? parseLocalityApi(locality) : null;
}

function filterQuery(filters?: LocalityFilters) {
  return (query: Knex.QueryBuilder<LocalityDBO>): void => {
    if (filters?.establishmentId) {
      query.whereIn(
        'geo_code',
        Establishments()
          .select(
            db.raw(
              `UNNEST(${establishmentsTable}.localities_geo_code::varchar[])`
            )
          )
          .where({ id: filters.establishmentId })
      );
    }
  };
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

export const formatLocalityApi = (locality: LocalityApi): LocalityDBO => ({
  id: locality.id,
  geo_code: locality.geoCode,
  name: locality.name,
  locality_kind: locality.kind,
  tax_kind: locality.taxKind,
  tax_rate: locality.taxRate
});

export const parseLocalityApi = (locality: LocalityDBO): LocalityApi => ({
  id: locality.id,
  geoCode: locality.geo_code,
  name: locality.name,
  kind: locality.locality_kind as LocalityKind,
  taxKind: locality.tax_kind as TaxKindsApi,
  taxRate: locality.tax_rate
});

export default {
  find,
  get,
  formatLocalityApi,
  update
};
