import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { SignupLinkApi } from '~/models/SignupLinkApi';

export const signupLinkTable = 'signup_links';
export const SignupLinks = (transaction = db) =>
  transaction<SignupLinkDBO>(signupLinkTable);

async function insert(link: SignupLinkApi): Promise<void> {
  logger.info('Insert signupLinkApi');
  await db(signupLinkTable).insert(formatSignupLinkApi(link));
}

async function get(id: string): Promise<SignupLinkApi | null> {
  logger.info('Get resetLinkApi with id', id);
  const link = await db(signupLinkTable).select().where('id', id).first();
  return link ? parseSignupLinkApi(link) : null;
}

async function used(id: string): Promise<void> {
  logger.info(`Remove used signup link ${id}`);
  await db(signupLinkTable).where('id', id).delete();
}

interface SignupLinkDBO {
  id: string;
  prospect_email: string;
  expires_at: Date;
}

export const parseSignupLinkApi = (link: SignupLinkDBO): SignupLinkApi => ({
  id: link.id,
  prospectEmail: link.prospect_email,
  expiresAt: link.expires_at,
});

export const formatSignupLinkApi = (link: SignupLinkApi): SignupLinkDBO => ({
  id: link.id,
  prospect_email: link.prospectEmail,
  expires_at: link.expiresAt,
});

export default {
  insert,
  get,
  used,
};
