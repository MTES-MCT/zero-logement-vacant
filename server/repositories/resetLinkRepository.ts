import db from './db';
import { ResetLinkApi } from '../models/ResetLinkApi';
import { logger } from '../utils/logger';

export const resetLinkTable = 'reset_links';
export const ResetLinks = (transaction = db) =>
  transaction<ResetLinkDBO>(resetLinkTable);

async function insert(resetLinkApi: ResetLinkApi): Promise<void> {
  logger.info('Insert resetLinkApi');
  await ResetLinks().insert(formatResetLinkApi(resetLinkApi));
}

async function get(id: string): Promise<ResetLinkApi | null> {
  logger.info('Get resetLinkApi with id', id);
  const link = await ResetLinks().select().where('id', id).first();
  return link ? parseResetLinkApi(link) : null;
}

async function used(id: string): Promise<void> {
  logger.info(`Set resetLinkApi ${id} as used`);
  await ResetLinks().where('id', id).update('used_at', new Date());
}

export interface ResetLinkDBO {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

export const parseResetLinkApi = (link: ResetLinkDBO): ResetLinkApi => ({
  id: link.id,
  userId: link.user_id,
  createdAt: link.created_at,
  expiresAt: link.expires_at,
  usedAt: link.used_at,
});

export const formatResetLinkApi = (link: ResetLinkApi): ResetLinkDBO => ({
  id: link.id,
  user_id: link.userId,
  created_at: link.createdAt,
  expires_at: link.expiresAt,
  used_at: link.usedAt ?? null,
});

export default {
  insert,
  get,
  used,
};
