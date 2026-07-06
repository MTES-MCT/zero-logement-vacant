import { randomUUID } from 'node:crypto';

import { UserRole } from '@zerologementvacant/models';
import type { Knex } from 'knex';

import db from '~/infra/database';
import type { UserApi } from '~/models/UserApi';
import { fromUserDBO, toUserDBO, Users } from '~/repositories/userRepository';

const AUTH_USERS_TABLE = 'auth_users';
const ACCOUNT_TABLE = 'account';
const CREDENTIAL_PROVIDER_ID = 'credential';

type Database = Knex | Knex.Transaction;
type AuthRole = 'admin' | 'usual' | 'visitor';

function toAuthRole(role: UserRole): AuthRole {
  switch (role) {
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.VISITOR:
      return 'visitor';
    case UserRole.USUAL:
    default:
      return 'usual';
  }
}

function toAuthUserRow(user: UserApi) {
  const name = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();

  return {
    id: user.id,
    name: name.length > 0 ? name : user.email,
    email: user.email,
    email_verified: true,
    first_name: user.firstName,
    last_name: user.lastName,
    role: toAuthRole(user.role),
    phone: user.phone,
    position: user.position,
    time_per_week: user.timePerWeek,
    kind: user.kind,
    activated_at: user.activatedAt,
    last_authenticated_at: user.lastAuthenticatedAt,
    suspended_at: user.suspendedAt,
    suspended_cause: user.suspendedCause,
    deleted_at: user.deletedAt,
    updated_at: user.updatedAt
  };
}

async function syncAuthUser(
  user: UserApi,
  transaction: Database
): Promise<void> {
  await transaction(AUTH_USERS_TABLE)
    .insert(toAuthUserRow(user))
    .onConflict('id')
    .merge([
      'name',
      'email',
      'email_verified',
      'first_name',
      'last_name',
      'role',
      'phone',
      'position',
      'time_per_week',
      'kind',
      'activated_at',
      'last_authenticated_at',
      'suspended_at',
      'suspended_cause',
      'deleted_at',
      'updated_at'
    ]);
}

async function syncCredentialAccount(
  user: UserApi,
  transaction: Database
): Promise<void> {
  if (user.deletedAt || !user.password) {
    return;
  }

  const existing = await transaction(ACCOUNT_TABLE)
    .where({
      user_id: user.id,
      provider_id: CREDENTIAL_PROVIDER_ID
    })
    .first();

  if (existing) {
    await transaction(ACCOUNT_TABLE).where({ id: existing.id }).update({
      account_id: user.email,
      password: user.password,
      updated_at: user.updatedAt
    });
    return;
  }

  await transaction(ACCOUNT_TABLE).insert({
    id: randomUUID(),
    account_id: user.email,
    provider_id: CREDENTIAL_PROVIDER_ID,
    user_id: user.id,
    password: user.password,
    updated_at: user.updatedAt
  });
}

async function syncUserToAuthTables(
  user: UserApi,
  transaction: Database
): Promise<void> {
  await syncAuthUser(user, transaction);
  await syncCredentialAccount(user, transaction);
}

export async function insertUserAndAuth(user: UserApi): Promise<UserApi> {
  return db.transaction(async (transaction) => {
    const [created] = await Users(transaction)
      .insert(toUserDBO(user))
      .returning('*');
    const createdUser = fromUserDBO(created);
    await syncUserToAuthTables(createdUser, transaction);
    return createdUser;
  });
}

export async function syncAuthTables(user: UserApi): Promise<void> {
  await db.transaction(async (transaction) => {
    await syncUserToAuthTables(user, transaction);
  });
}

export async function updateUserAndAuth(
  user: UserApi,
  options?: { passwordChanged?: boolean }
): Promise<void> {
  await db.transaction(async (transaction) => {
    await Users(transaction).where({ id: user.id }).update(toUserDBO(user));
    await syncAuthUser(user, transaction);
    if (options?.passwordChanged) {
      await syncCredentialAccount(user, transaction);
    }
  });
}
