import db from './db';
import { SignupLinkApi } from '../models/SignupLinkApi';
import { logger } from '../utils/logger';

export const signupLinkTable = 'signup_links';

const insert = async (link: SignupLinkApi): Promise<void> => {
  logger.info('Insert signupLinkApi');
  await db(signupLinkTable).insert(formatSignupLinkApi(link));
};

const get = async (id: string): Promise<SignupLinkApi | null> => {
  logger.info('Get resetLinkApi with id', id);
  const link = await db(signupLinkTable).select().where('id', id).first();
  return link ? parseSignupLinkApi(link) : null;
};

const used = async (id: string): Promise<void> => {
  logger.info(`Remove used signup link ${id}`);
  await db(signupLinkTable).where('id', id).delete();
};

interface SignupLinkDbo {
  id: string;
  prospect_email: string;
  expires_at: Date;
}

export const parseSignupLinkApi = (link: SignupLinkDbo): SignupLinkApi => ({
  id: link.id,
  prospectEmail: link.prospect_email,
  expiresAt: link.expires_at,
});

export const formatSignupLinkApi = (link: SignupLinkApi): SignupLinkDbo => ({
  id: link.id,
  prospect_email: link.prospectEmail,
  expires_at: link.expiresAt,
});

export default {
  insert,
  get,
  used,
  parseSignupLinkApi,
  formatSignupLinkApi,
};
