import { randomUUID } from 'node:crypto';

import type { Transaction } from 'kysely';

import { createPasswordVerifier } from '~/infra/auth-password';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import type { UserApi } from '~/models/UserApi';
import {
  parseUserRow,
  toUserInsert,
  toUserUpdate
} from '~/repositories/userRepository';

const CREDENTIAL_PROVIDER_ID = 'credential';

function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

function toAuthIdentityRow(user: UserApi) {
  const name = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();

  return {
    id: user.id,
    name: name.length > 0 ? name : user.email,
    email: normalizeEmail(user.email),
    emailVerified: true,
    updatedAt: new Date(user.updatedAt)
  };
}

async function syncAuthIdentity(
  user: UserApi,
  trx: Transaction<DB>
): Promise<void> {
  const row = toAuthIdentityRow(user);
  await trx
    .insertInto('authUsers')
    .values(row)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet({
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        updatedAt: row.updatedAt
      })
    )
    .execute();
}

async function upsertCredentialAccount(
  userId: string,
  email: string,
  passwordHash: string,
  trx: Transaction<DB>
): Promise<void> {
  const existing = await trx
    .selectFrom('account')
    .selectAll()
    .where('userId', '=', userId)
    .where('providerId', '=', CREDENTIAL_PROVIDER_ID)
    .executeTakeFirst();
  const now = new Date();

  if (existing) {
    await trx
      .updateTable('account')
      .set({
        accountId: normalizeEmail(email),
        password: passwordHash,
        updatedAt: now
      })
      .where('id', '=', existing.id)
      .execute();
    return;
  }

  await trx
    .insertInto('account')
    .values({
      id: randomUUID(),
      accountId: normalizeEmail(email),
      providerId: CREDENTIAL_PROVIDER_ID,
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now
    })
    .execute();
}

export async function insertUserWithAuthIdentity(
  user: UserApi,
  credentialHash: string
): Promise<UserApi> {
  return withinKyselyTransaction(async (trx) => {
    const row = await trx
      .insertInto('users')
      .values({ ...toUserInsert(user), password: null })
      .returningAll()
      .executeTakeFirstOrThrow();
    const createdUser = parseUserRow(row);
    await syncAuthIdentity(createdUser, trx);
    await upsertCredentialAccount(
      createdUser.id,
      createdUser.email,
      credentialHash,
      trx
    );
    return createdUser;
  });
}

export async function updateUserWithAuthIdentity(
  user: UserApi,
  options: { credentialHash?: string } = {}
): Promise<void> {
  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('users')
      .set(toUserUpdate(user))
      .where('id', '=', user.id)
      .execute();
    await syncAuthIdentity(user, trx);
    if (options.credentialHash) {
      await upsertCredentialAccount(
        user.id,
        user.email,
        options.credentialHash,
        trx
      );
    }
  });
}

export async function updateCredentialPassword(
  userId: string,
  email: string,
  passwordHash: string
): Promise<void> {
  await withinKyselyTransaction(async (trx) => {
    await upsertCredentialAccount(userId, email, passwordHash, trx);
  });
}

export async function verifyCredentialPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const account = await kysely
    .selectFrom('account')
    .selectAll()
    .where('userId', '=', userId)
    .where('providerId', '=', CREDENTIAL_PROVIDER_ID)
    .executeTakeFirst();
  if (!account?.password) {
    return false;
  }

  return createPasswordVerifier({ rehash: null })({
    hash: account.password,
    password
  });
}
