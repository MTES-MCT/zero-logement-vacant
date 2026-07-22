import { randomUUID } from 'node:crypto';

import type { Knex } from 'knex';

import { createPasswordVerifier } from '~/infra/auth-password';
import db from '~/infra/database';
import type { UserApi } from '~/models/UserApi';
import { fromUserDBO, toUserDBO, Users } from '~/repositories/userRepository';

const AUTH_USERS_TABLE = 'auth_users';
const ACCOUNT_TABLE = 'account';
const CREDENTIAL_PROVIDER_ID = 'credential';

type Database = Knex | Knex.Transaction;

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
    email_verified: true,
    updated_at: user.updatedAt
  };
}

async function syncAuthIdentity(
  user: UserApi,
  transaction: Database
): Promise<void> {
  await transaction(AUTH_USERS_TABLE)
    .insert(toAuthIdentityRow(user))
    .onConflict('id')
    .merge(['name', 'email', 'email_verified', 'updated_at']);
}

async function upsertCredentialAccount(
  userId: string,
  email: string,
  passwordHash: string,
  transaction: Database
): Promise<void> {
  const existing = await transaction(ACCOUNT_TABLE)
    .where({
      user_id: userId,
      provider_id: CREDENTIAL_PROVIDER_ID
    })
    .first();
  const now = new Date();

  if (existing) {
    await transaction(ACCOUNT_TABLE)
      .where({ id: existing.id })
      .update({
        account_id: normalizeEmail(email),
        password: passwordHash,
        updated_at: now
      });
    return;
  }

  await transaction(ACCOUNT_TABLE).insert({
    id: randomUUID(),
    account_id: normalizeEmail(email),
    provider_id: CREDENTIAL_PROVIDER_ID,
    user_id: userId,
    password: passwordHash,
    created_at: now,
    updated_at: now
  });
}

export async function insertUserWithAuthIdentity(
  user: UserApi,
  credentialHash: string
): Promise<UserApi> {
  return db.transaction(async (transaction) => {
    const [created] = await Users(transaction)
      .insert({ ...toUserDBO(user), password: null })
      .returning('*');
    const createdUser = fromUserDBO(created);
    await syncAuthIdentity(createdUser, transaction);
    await upsertCredentialAccount(
      createdUser.id,
      createdUser.email,
      credentialHash,
      transaction
    );
    return createdUser;
  });
}

export async function updateUserWithAuthIdentity(
  user: UserApi,
  options: { credentialHash?: string } = {}
): Promise<void> {
  await db.transaction(async (transaction) => {
    const { password: _legacyPassword, ...userRow } = toUserDBO(user);
    await Users(transaction).where({ id: user.id }).update(userRow);
    await syncAuthIdentity(user, transaction);
    if (options.credentialHash) {
      await upsertCredentialAccount(
        user.id,
        user.email,
        options.credentialHash,
        transaction
      );
    }
  });
}

export async function updateCredentialPassword(
  userId: string,
  email: string,
  passwordHash: string
): Promise<void> {
  await db.transaction(async (transaction) => {
    await upsertCredentialAccount(userId, email, passwordHash, transaction);
  });
}

export async function verifyCredentialPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const account = await db(ACCOUNT_TABLE)
    .where({ user_id: userId, provider_id: CREDENTIAL_PROVIDER_ID })
    .first();
  if (!account?.password) {
    return false;
  }

  return createPasswordVerifier({ rehash: null })({
    hash: account.password,
    password
  });
}
