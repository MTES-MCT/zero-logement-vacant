import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { SignupLinkApi } from '~/models/SignupLinkApi';

/** Real (snake_case) table name — used by raw-SQL callers such as seeds. */
export const signupLinkTable = 'signup_links';

async function insert(link: SignupLinkApi): Promise<void> {
  logger.info('Insert signupLinkApi');
  await kysely.insertInto('signupLinks').values(link).execute();
}

async function get(id: string): Promise<SignupLinkApi | null> {
  logger.info('Get signupLinkApi with id', id);
  const row = await kysely
    .selectFrom('signupLinks')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
  return row ?? null;
}

async function used(id: string): Promise<void> {
  logger.info(`Remove used signup link ${id}`);
  await kysely.deleteFrom('signupLinks').where('id', '=', id).execute();
}

async function getByEmail(email: string): Promise<SignupLinkApi | null> {
  logger.debug('Get signupLinkApi by prospect_email', email);
  const row = await kysely
    .selectFrom('signupLinks')
    .where('prospectEmail', '=', email)
    .selectAll()
    .executeTakeFirst();
  return row ?? null;
}

export default {
  insert,
  get,
  used,
  getByEmail
};
