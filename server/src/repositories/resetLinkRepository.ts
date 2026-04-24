import type { Insertable, Selectable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { ResetLinkApi } from '~/models/ResetLinkApi';

export const resetLinkTable = 'reset_links';

/** Snake-case DBO used by legacy Knex accessors and controller tests. */
export interface ResetLinkDBO {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

/** Knex query builder accessor — kept for controller tests that assert via DB. */
export const ResetLinks = (transaction = db) =>
  transaction<ResetLinkDBO>(resetLinkTable);

type KyselyResetLinkDBO = Selectable<DB['resetLinks']>;

async function insert(resetLinkApi: ResetLinkApi): Promise<void> {
  logger.info('Insert resetLinkApi');
  await kysely
    .insertInto('resetLinks')
    .values(toKyselyInsertable(resetLinkApi))
    .execute();
}

async function get(id: string): Promise<ResetLinkApi | null> {
  logger.info('Get resetLinkApi with id', id);
  const row = await kysely
    .selectFrom('resetLinks')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
  return row ? fromKyselyRow(row) : null;
}

async function used(id: string): Promise<void> {
  logger.info(`Set resetLinkApi ${id} as used`);
  await kysely
    .updateTable('resetLinks')
    .set({ usedAt: new Date() })
    .where('id', '=', id)
    .execute();
}

/** Parse snake_case DBO (from Knex) → ResetLinkApi. */
export const parseResetLinkApi = (row: ResetLinkDBO): ResetLinkApi => ({
  id: row.id,
  userId: row.user_id,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  usedAt: row.used_at ?? null
});

/** Format ResetLinkApi → snake_case DBO (for Knex inserts in controller tests). */
export const formatResetLinkApi = (link: ResetLinkApi): ResetLinkDBO => ({
  id: link.id,
  user_id: link.userId,
  created_at: link.createdAt,
  expires_at: link.expiresAt,
  used_at: link.usedAt ?? null
});

/** Internal: camelCase for Kysely inserts. */
function toKyselyInsertable(link: ResetLinkApi): Insertable<DB['resetLinks']> {
  return {
    id: link.id,
    userId: link.userId,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    usedAt: link.usedAt ?? null
  };
}

/** Internal: camelCase row from Kysely → ResetLinkApi. */
function fromKyselyRow(row: KyselyResetLinkDBO): ResetLinkApi {
  return {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt ?? null
  };
}

export default {
  insert,
  get,
  used
};
