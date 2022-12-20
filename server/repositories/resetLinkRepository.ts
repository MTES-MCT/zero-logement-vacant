import db from './db';
import { ResetLinkApi } from '../models/ResetLinkApi';

export const resetLinkTable = 'reset_links';

const insert = async (resetLinkApi: ResetLinkApi): Promise<void> => {
  console.log('Insert resetLinkApi');
  await db(resetLinkTable).insert(formatResetLinkApi(resetLinkApi));
};

interface ResetLinkDbo {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

export const formatResetLinkApi = (link: ResetLinkApi): ResetLinkDbo => ({
  id: link.id,
  user_id: link.userId,
  created_at: link.createdAt,
  expires_at: link.expiresAt,
  used_at: link.usedAt ?? null,
});

export default {
  insert,
  formatResetLinkApi,
};
