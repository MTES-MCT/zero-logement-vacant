/**
 * Hand-maintained overrides on top of the auto-generated db.d.ts.
 *
 * Rules:
 *  - DateString: columns that are PG `date` (no time, no timezone).
 *    pg.types returns them as "YYYY-MM-DD" strings (see kysely.ts).
 *  - Import this file instead of db.d.ts everywhere Kysely is used.
 */

import type { ColumnType } from 'kysely';
import type { DB as GeneratedDB } from '~/infra/database/db';

/** "YYYY-MM-DD" string — what the pg driver returns for PG DATE columns. */
export type DateString = ColumnType<string, string, string>;

export interface DB
  extends Omit<
    GeneratedDB,
    'owners' | 'owners_duplicates' | 'owners_housing' | 'buildings'
  > {
  owners: Omit<GeneratedDB['owners'], 'birth_date'> & {
    birth_date: DateString | null;
  };
  owners_duplicates: Omit<GeneratedDB['owners_duplicates'], 'birth_date'> & {
    birth_date: DateString | null;
  };
  owners_housing: Omit<
    GeneratedDB['owners_housing'],
    'start_date' | 'end_date'
  > & {
    start_date: DateString | null;
    end_date: DateString | null;
  };
  buildings: Omit<GeneratedDB['buildings'], 'dpe_date_at'> & {
    dpe_date_at: DateString | null;
  };
}
