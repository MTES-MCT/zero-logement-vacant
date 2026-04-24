import type { Insertable, Selectable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { SignupLinkApi } from '~/models/SignupLinkApi';

// Legacy exports kept for backward compatibility with existing callers
export const signupLinkTable = 'signup_links';
export const SignupLinks = (transaction = db) =>
  transaction<{ id: string; prospect_email: string; expires_at: Date }>(signupLinkTable);

// Re-export DBO type — callers that import SignupLinkDBO continue to work.
export type SignupLinkDBO = Selectable<DB['signupLinks']>;

async function insert(link: SignupLinkApi): Promise<void> {
  logger.info('Insert signupLinkApi');
  await kysely.insertInto('signupLinks').values(formatSignupLinkApi(link)).execute();
}

async function get(id: string): Promise<SignupLinkApi | null> {
  logger.info('Get signupLinkApi with id', id);
  const row = await kysely
    .selectFrom('signupLinks')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
  return row ? parseSignupLinkApi(row) : null;
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
  return row ? parseSignupLinkApi(row) : null;
}

export const parseSignupLinkApi = (row: SignupLinkDBO): SignupLinkApi => ({
  id: row.id,
  prospectEmail: row.prospectEmail,
  expiresAt: row.expiresAt
});

export const formatSignupLinkApi = (link: SignupLinkApi): Insertable<DB['signupLinks']> => ({
  id: link.id,
  prospectEmail: link.prospectEmail,
  expiresAt: link.expiresAt
});

export default {
  insert,
  get,
  used,
  getByEmail
};
