import { LocalityKind, TaxKind } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createLogger } from '~/infra/logger';
import { LocalityApi } from '~/models/LocalityApi';
import { establishmentsTable } from '~/repositories/establishmentRepository';

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
  const filters = options?.filters;
  const rows = await kysely
    .selectFrom('localities')
    .selectAll()
    // Filter by specific geoCodes (user perimeter filtering takes priority)
    // Note: geoCodes is an array when a restriction applies
    //   - non-empty array: filter to localities with these geoCodes
    //   - empty array: user should see NO localities (intersection with perimeter is empty)
    .$if(
      filters?.geoCodes !== undefined && filters.geoCodes.length === 0,
      (query) => query.where(sql<boolean>`1 = 0`)
    )
    .$if(!!filters?.geoCodes?.length, (query) =>
      query.where('geoCode', 'in', filters?.geoCodes ?? [])
    )
    // Filter by establishment geoCodes (default behavior) — only when geoCodes wasn't provided at all
    .$if(
      filters?.geoCodes === undefined && !!filters?.establishmentId,
      (query) =>
        query.where(
          'geoCode',
          'in',
          kysely
            .selectFrom('establishments')
            .select(
              sql<string>`UNNEST(${sql.raw(establishmentsTable)}.localities_geo_code::varchar[])`.as(
                'geoCode'
              )
            )
            .where('id', '=', filters?.establishmentId ?? '')
        )
    )
    .orderBy('name')
    .execute();

  return rows.map(parseLocalityRow);
}

async function get(geoCode: string): Promise<LocalityApi | null> {
  logger.debug('Get locality', { geoCode });
  const row = await kysely
    .selectFrom('localities')
    .selectAll()
    .where('geoCode', '=', geoCode)
    .executeTakeFirst();
  return row ? parseLocalityRow(row) : null;
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

  const row = await kysely
    .updateTable('localities')
    .set({
      taxRate: localityApi.taxRate ?? null,
      taxKind: localityApi.taxKind
    })
    .where('geoCode', '=', localityApi.geoCode)
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseLocalityRow(row);
}

export const formatLocalityApi = (locality: LocalityApi): LocalityDBO => ({
  id: locality.id,
  geo_code: locality.geoCode,
  name: locality.name,
  locality_kind: locality.kind,
  tax_kind: locality.taxKind,
  tax_rate: locality.taxRate
});

function parseLocalityRow(row: Selectable<DB['localities']>): LocalityApi {
  return {
    id: row.id,
    geoCode: row.geoCode,
    name: row.name,
    kind: row.localityKind as LocalityKind | null,
    taxKind: row.taxKind as TaxKind,
    // DB column is nullable and the pre-Kysely code already returned a
    // literal `null` here despite LocalityDTO.taxRate being typed
    // `number | undefined` — preserved as-is, not fixed.
    taxRate: row.taxRate as number | undefined
  };
}

export default {
  find,
  get,
  formatLocalityApi,
  update
};
