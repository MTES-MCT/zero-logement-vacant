import db from './db';
import { ResetLinkApi } from '../models/ResetLinkApi';

export const resetLinkTable = 'reset_links';

const insert = async (resetLinkApi: ResetLinkApi): Promise<void> => {
  console.log('Insert resetLinkApi');
  await db(resetLinkTable).insert(formatResetLinkApi(resetLinkApi));
};

const get = async (id: string): Promise<ResetLinkApi | null> => {
  console.log('Get resetLinkApi with id', id);
  const link = await db(resetLinkTable).select().where('id', id).first();
  return link ? parseResetLinkApi(link) : null;
};

const used = async (id: string): Promise<void> => {
  console.log(`Set resetLinkApi ${id} as used`);
  await db(resetLinkTable).where('id', id).update('used_at', new Date());
};

interface ResetLinkDbo {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

export const parseResetLinkApi = (link: ResetLinkDbo): ResetLinkApi => ({
  id: link.id,
  userId: link.user_id,
  createdAt: link.created_at,
  expiresAt: link.expires_at,
  usedAt: link.used_at,
});

export const formatResetLinkApi = (link: ResetLinkApi): ResetLinkDbo => ({
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
  parseResetLinkApi,
  formatResetLinkApi,
};
