import type { DatafoncierOwner } from '@zerologementvacant/models';
import { Array, Record } from 'effect';
import { camelToSnake } from 'effect/String';
import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';

export const datafoncierOwnersTable = 'df_owners_nat_2024';
export const DatafoncierOwners = (transaction = db) =>
  transaction<DatafoncierOwner>(datafoncierOwnersTable);

interface DatafoncierOwnerFilters {
  idprocpte?: string;
}

interface FindOptions {
  filters?: DatafoncierOwnerFilters;
}

// CamelCasePlugin's runtime snake_case reversal of 'dfOwnersNat2024' produces
// 'df_owners_nat2024' (no underscore before the digits) — doesn't match the
// real table `df_owners_nat_2024` (same digit-boundary limitation as
// dfHousingNat2024, see the datafoncierHousingRepository Phase 3 plan). Pass
// a raw, correctly-spelled table reference, told to TypeScript as the typed
// key so column selects still resolve against the real schema.
function datafoncierOwnersFrom() {
  return sql`df_owners_nat_2024`.as(
    'dfOwnersNat2024'
  ) as unknown as 'dfOwnersNat2024';
}

class DatafoncierOwnersRepository {
  async count(): Promise<number> {
    // Equivalent to the original's `DISTINCT ON (idpersonne) SELECT
    // idpersonne ... wrapped in COUNT(*)`: both count the number of
    // distinct idpersonne values matching the ccogrm condition.
    const result = await kysely
      .selectFrom(datafoncierOwnersFrom())
      .select((eb) => eb.fn.count<string>('idpersonne').distinct().as('total'))
      .where((eb) =>
        eb.or([eb('ccogrm', 'is', null), eb('ccogrm', 'in', ['0', '7', '8'])])
      )
      .executeTakeFirst();

    return Number(result?.total ?? 0);
  }

  async findDatafoncierOwners(opts?: FindOptions): Promise<DatafoncierOwner[]> {
    const rows = await kysely
      .selectFrom(datafoncierOwnersFrom())
      .selectAll()
      .$if(opts?.filters?.idprocpte !== undefined, (query) =>
        query.where('idprocpte', '=', opts?.filters?.idprocpte ?? '')
      )
      .orderBy('dnulp')
      .execute();

    const owners = rows.map(parseDatafoncierOwnerRow);
    return Array.dedupeWith(owners, (a, b) => a.idpersonne === b.idpersonne);
  }
}

type DatafoncierOwnerRow = Selectable<DB['dfOwnersNat2024']>;

function parseDatafoncierOwnerRow(row: DatafoncierOwnerRow): DatafoncierOwner {
  // Every column comes back camelCased by CamelCasePlugin, but
  // DatafoncierOwner (and every caller) expects the raw snake_case DB shape
  // Knex used to return — convert back generically rather than
  // hand-mapping every field (same approach as datafoncierHousingRepository).
  return Record.mapKeys(row, camelToSnake) as unknown as DatafoncierOwner;
}

function createDatafoncierOwnersRepository() {
  return new DatafoncierOwnersRepository();
}

export default createDatafoncierOwnersRepository;
