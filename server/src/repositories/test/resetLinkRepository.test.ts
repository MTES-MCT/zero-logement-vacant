import { faker } from '@faker-js/faker/locale/fr';
import { describe, it, expect, beforeAll } from 'vitest';

import { kysely } from '~/infra/database/kysely';
import { UserApi } from '~/models/UserApi';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import { factories } from '~/test/factories';

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
  let user: UserApi;

  beforeAll(async () => {
    const establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('insert', () => {
    it('should insert a reset link', async () => {
      const link = genResetLinkApi(user.id);

      await resetLinkRepository.insert(link);

      const row = await kysely
        .selectFrom('resetLinks')
        .where('id', '=', link.id)
        .selectAll()
        .executeTakeFirst();
      expect(row).toMatchObject({ id: link.id, userId: user.id });
    });
  });

  describe('get', () => {
    it('should return null for a non-existent id', async () => {
      const result = await resetLinkRepository.get(faker.string.uuid());
      expect(result).toBeNull();
    });

    it('should return the reset link by id', async () => {
      const link = genResetLinkApi(user.id);
      await kysely.insertInto('resetLinks').values(link).execute();

      const result = await resetLinkRepository.get(link.id);

      expect(result).toMatchObject({ id: link.id, userId: link.userId });
    });
  });

  describe('used', () => {
    it('should set used_at on the link', async () => {
      const link = genResetLinkApi(user.id);
      await kysely.insertInto('resetLinks').values(link).execute();

      await resetLinkRepository.used(link.id);

      const row = await kysely
        .selectFrom('resetLinks')
        .where('id', '=', link.id)
        .selectAll()
        .executeTakeFirst();
      expect(row?.usedAt).not.toBeNull();
    });
  });
});
