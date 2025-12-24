import { LocalityKind, TaxKind } from '@zerologementvacant/models';
import { Knex } from 'knex';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { LocalityApi } from '~/models/LocalityApi';
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
  /**
   * Filter by specific geoCodes (used for user perimeter filtering)
   */
  geoCodes?: string[];
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
    // Filter by specific geoCodes (user perimeter filtering takes priority)
    // Note: geoCodes is an array when a restriction applies
    //   - non-empty array: filter to localities with these geoCodes
    //   - empty array: user should see NO localities (intersection with perimeter is empty)
    if (filters?.geoCodes !== undefined) {
      if (filters.geoCodes.length === 0) {
        // Empty geoCodes means no access - return no localities
        query.whereRaw('1 = 0');
      } else {
        query.whereIn('geo_code', filters.geoCodes);
      }
    } else if (filters?.establishmentId) {
      // Filter by establishment geoCodes (default behavior)
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
  locality_kind: LocalityKind | null;
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
  taxKind: locality.tax_kind as TaxKind,
  taxRate: locality.tax_rate
});

export default {
  find,
  get,
  formatLocalityApi,
  update
};
