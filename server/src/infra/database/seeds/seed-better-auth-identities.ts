import { randomUUID } from 'node:crypto';

import type { Knex } from 'knex';

import type { UserApi } from '~/models/UserApi';

/**
 * Seed Better Auth identities for users created by a database seed.
 *
 * The shared UUID keeps the legacy profile and authentication identity linked,
 * while credential accounts reuse the existing bcrypt hash.
 */
export async function seedBetterAuthIdentities(
  knex: Knex,
  users: ReadonlyArray<UserApi>
): Promise<void> {
  if (users.length === 0) return;

  const authUserRows = users.map((user) => {
    const fullName = [user.firstName, user.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim();

    return {
      id: user.id,
      name: fullName.length > 0 ? fullName : user.email,
      email: user.email.toLowerCase(),
      email_verified: true,
      created_at: user.activatedAt ?? user.updatedAt,
      updated_at: user.updatedAt
    };
  });
  await knex.batchInsert('auth_users', authUserRows);

  const accountRows = users
    .filter((user) => !user.deletedAt && user.password)
    .map((user) => ({
      id: randomUUID(),
      account_id: user.email.toLowerCase(),
      provider_id: 'credential',
      user_id: user.id,
      password: user.password
    }));
  if (accountRows.length > 0) {
    await knex.batchInsert('account', accountRows);
  }
}
