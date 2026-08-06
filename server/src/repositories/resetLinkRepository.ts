import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { ResetLinkApi } from '~/models/ResetLinkApi';

/** Real (snake_case) table name — used by raw-SQL callers such as seeds. */
export const resetLinkTable = 'reset_links';

async function insert(resetLinkApi: ResetLinkApi): Promise<void> {
  logger.info('Insert resetLinkApi');
  await kysely.insertInto('resetLinks').values(resetLinkApi).execute();
}

async function get(id: string): Promise<ResetLinkApi | null> {
  logger.info('Get resetLinkApi with id', id);
  const row = await kysely
    .selectFrom('resetLinks')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
  return row ?? null;
}

async function used(id: string): Promise<void> {
  logger.info(`Set resetLinkApi ${id} as used`);
  await kysely
    .updateTable('resetLinks')
    .set({ usedAt: new Date() })
    .where('id', '=', id)
    .execute();
}

export default {
  insert,
  get,
  used
};
