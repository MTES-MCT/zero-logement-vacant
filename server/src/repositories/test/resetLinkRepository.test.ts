import { faker } from '@faker-js/faker/locale/fr';
import { describe, it, expect, beforeAll } from 'vitest';

import db from '~/infra/database';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

const ResetLinks = () =>
  db<{
    id: string;
    user_id: string;
    created_at: Date;
    expires_at: Date;
    used_at: Date | null;
  }>('reset_links');

function genResetLinkApi(userId: string) {
  return {
    id: faker.string.uuid(),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null
  };
}

describe('resetLinkRepository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('insert', () => {
    it('should insert a reset link', async () => {
      const link = genResetLinkApi(user.id);

      await resetLinkRepository.insert(link);

      const row = await ResetLinks().where('id', link.id).first();
      expect(row).toMatchObject({ id: link.id, user_id: user.id });
    });
  });

  describe('get', () => {
    it('should return null for a non-existent id', async () => {
      const result = await resetLinkRepository.get(faker.string.uuid());
      expect(result).toBeNull();
    });

    it('should return the reset link by id', async () => {
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert({
        id: link.id,
        user_id: link.userId,
        created_at: link.createdAt,
        expires_at: link.expiresAt,
        used_at: null
      });

      const result = await resetLinkRepository.get(link.id);

      expect(result).toMatchObject({ id: link.id, userId: link.userId });
    });
  });

  describe('used', () => {
    it('should set used_at on the link', async () => {
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert({
        id: link.id,
        user_id: link.userId,
        created_at: link.createdAt,
        expires_at: link.expiresAt,
        used_at: null
      });

      await resetLinkRepository.used(link.id);

      const row = await ResetLinks().where('id', link.id).first();
      expect(row?.used_at).not.toBeNull();
    });
  });
});
