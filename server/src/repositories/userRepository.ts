import type { TimePerWeek, UserFilters } from '@zerologementvacant/models';
import { Knex } from 'knex';

import db, { notDeleted } from '~/infra/database';
import { logger } from '~/infra/logger';
import { PaginationApi, paginationQuery } from '~/models/PaginationApi';
import { UserApi } from '~/models/UserApi';

import { USERS_ESTABLISHMENTS_TABLE } from './user-establishment-repository';

export const USERS_TABLE = 'users';

export const Users = (transaction = db) => transaction<UserDBO>(USERS_TABLE);

async function get(id: string): Promise<UserApi | null> {
  logger.debug('Get user by id', id);

  const result = await Users()
    .where(`${USERS_TABLE}.id`, id)
    .andWhere(notDeleted)
    .first();

  return result ? fromUserDBO(result) : null;
}

async function getByEmail(email: string): Promise<UserApi | null> {
  logger.debug('Get user by email', email);

  const result = await Users()
    .whereRaw('upper(email) = upper(?)', email)
    .andWhere(notDeleted)
    .first();

  return result ? fromUserDBO(result) : null;
}

async function getByEmailIncludingDeleted(
  email: string
): Promise<UserApi | null> {
  logger.debug('Get user by email (including deleted)', email);

  const result = await Users()
    .whereRaw('upper(email) = upper(?)', email)
    .first();

  return result ? fromUserDBO(result) : null;
}

async function update(user: UserApi): Promise<void> {
  logger.debug('Updating user...', { id: user.id });
  await Users().where({ id: user.id }).update(toUserDBO(user));
}

async function recordTwoFactorFailure(
  userId: string,
  maximumAttempts: number,
  lockedUntil: Date
): Promise<void> {
  await Users()
    .where({ id: userId })
    .update({
      two_factor_failed_attempts: db.raw('two_factor_failed_attempts + 1'),
      two_factor_locked_until: db.raw(
        `CASE
          WHEN two_factor_failed_attempts + 1 >= ?
          THEN COALESCE(two_factor_locked_until, ?)
          ELSE two_factor_locked_until
        END`,
        [maximumAttempts, lockedUntil]
      ),
      updated_at: new Date()
    });
}

async function insert(userApi: UserApi): Promise<UserApi> {
  logger.info('Insert user with email', userApi.email);
  return db(USERS_TABLE)
    .insert(toUserDBO(userApi))
    .returning('*')
    .then((_) => fromUserDBO(_[0]));
}

interface FindOptions {
  filters?: UserFilters;
  pagination?: PaginationApi;
}

async function find(opts?: FindOptions): Promise<UserApi[]> {
  const users: UserDBO[] = await db<UserDBO>(USERS_TABLE)
    .select(`${USERS_TABLE}.*`)
    .where(notDeleted)
    .modify((builder) => {
      if (opts?.filters?.establishments?.length) {
        builder.distinct(`${USERS_TABLE}.id`);
      }
    })
    .modify(filter(opts?.filters))
    // TODO: flexible sort
    .orderBy(['last_name', 'first_name'])
    .modify(paginationQuery(opts?.pagination));

  return users.map(fromUserDBO);
}

interface CountOptions {
  filters?: UserFilters;
}

function filter(filters?: UserFilters) {
  return (builder: Knex.QueryBuilder<UserDBO>) => {
    const establishmentIds = filters?.establishments;
    if (establishmentIds?.length) {
      builder.join(USERS_ESTABLISHMENTS_TABLE, function () {
        this.on(
          `${USERS_ESTABLISHMENTS_TABLE}.user_id`,
          '=',
          `${USERS_TABLE}.id`
        )
          .onIn(
            `${USERS_ESTABLISHMENTS_TABLE}.establishment_id`,
            establishmentIds
          )
          .andOnVal(`${USERS_ESTABLISHMENTS_TABLE}.has_commitment`, true);
      });
    }
  };
}

async function count(opts?: CountOptions): Promise<number> {
  const result = await db<UserDBO>(USERS_TABLE)
    .where(notDeleted)
    .modify(filter(opts?.filters))
    .countDistinct(`${USERS_TABLE}.id`)
    .first();

  return Number(result?.count);
}

async function remove(userId: string): Promise<void> {
  logger.info('Remove user', userId);
  const deletedAt = new Date();

  await db.transaction(async (transaction) => {
    await transaction('session').where({ user_id: userId }).delete();
    await transaction('account').where({ user_id: userId }).delete();
    await transaction('auth_users').where({ id: userId }).update({
      deleted_at: deletedAt,
      updated_at: deletedAt
    });
    await transaction(USERS_TABLE).where('id', userId).update({
      deleted_at: deletedAt,
      updated_at: deletedAt
    });
  });
}

export interface UserDBO {
  id: string;
  email: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
  establishment_id: string | null;
  role: number;
  activated_at: Date | string;
  last_authenticated_at: Date | string | null;
  suspended_at: Date | string | null;
  suspended_cause: string | null;
  deleted_at: Date | string | null;
  updated_at: Date | string;
  phone: string | null;
  position: string | null;
  time_per_week: TimePerWeek | null;
  kind: string | null;
  two_factor_secret: string | null;
  two_factor_enabled_at: Date | string | null;
  two_factor_code: string | null;
  two_factor_code_generated_at: Date | string | null;
  two_factor_failed_attempts: number;
  two_factor_locked_until: Date | string | null;
}

export const fromUserDBO = (userDBO: UserDBO): UserApi => ({
  id: userDBO.id,
  email: userDBO.email,
  password: userDBO.password,
  firstName: userDBO.first_name,
  lastName: userDBO.last_name,
  establishmentId: userDBO.establishment_id,
  role: userDBO.role,
  activatedAt: new Date(userDBO.activated_at).toJSON(),
  lastAuthenticatedAt: userDBO.last_authenticated_at
    ? new Date(userDBO.last_authenticated_at).toJSON()
    : null,
  suspendedAt: userDBO.suspended_at
    ? new Date(userDBO.suspended_at).toJSON()
    : null,
  suspendedCause: userDBO.suspended_cause,
  deletedAt: userDBO.deleted_at ? new Date(userDBO.deleted_at).toJSON() : null,
  updatedAt: new Date(userDBO.updated_at).toJSON(),
  phone: userDBO.phone,
  position: userDBO.position,
  timePerWeek: userDBO.time_per_week,
  kind: userDBO.kind,
  twoFactorSecret: userDBO.two_factor_secret,
  twoFactorEnabledAt: userDBO.two_factor_enabled_at
    ? new Date(userDBO.two_factor_enabled_at).toJSON()
    : null,
  twoFactorCode: userDBO.two_factor_code,
  twoFactorCodeGeneratedAt: userDBO.two_factor_code_generated_at
    ? new Date(userDBO.two_factor_code_generated_at).toJSON()
    : null,
  twoFactorFailedAttempts: userDBO.two_factor_failed_attempts,
  twoFactorLockedUntil: userDBO.two_factor_locked_until
    ? new Date(userDBO.two_factor_locked_until).toJSON()
    : null
});

export const toUserDBO = (userApi: UserApi): UserDBO => ({
  id: userApi.id,
  email: userApi.email,
  password: userApi.password,
  first_name: userApi.firstName,
  last_name: userApi.lastName,
  establishment_id: userApi.establishmentId,
  role: userApi.role,
  activated_at: new Date(userApi.activatedAt).toJSON(),
  last_authenticated_at: userApi.lastAuthenticatedAt
    ? new Date(userApi.lastAuthenticatedAt).toJSON()
    : null,
  suspended_at: userApi.suspendedAt
    ? new Date(userApi.suspendedAt).toJSON()
    : null,
  suspended_cause: userApi.suspendedCause,
  deleted_at: userApi.deletedAt ? new Date(userApi.deletedAt).toJSON() : null,
  updated_at: new Date(userApi.updatedAt).toJSON(),
  phone: userApi.phone,
  position: userApi.position,
  time_per_week: userApi.timePerWeek,
  kind: userApi.kind,
  two_factor_secret: userApi.twoFactorSecret,
  two_factor_enabled_at: userApi.twoFactorEnabledAt
    ? new Date(userApi.twoFactorEnabledAt).toJSON()
    : null,
  two_factor_code: userApi.twoFactorCode,
  two_factor_code_generated_at: userApi.twoFactorCodeGeneratedAt
    ? new Date(userApi.twoFactorCodeGeneratedAt).toJSON()
    : null,
  two_factor_failed_attempts: userApi.twoFactorFailedAttempts,
  two_factor_locked_until: userApi.twoFactorLockedUntil
    ? new Date(userApi.twoFactorLockedUntil).toJSON()
    : null
});

export default {
  get,
  getByEmail,
  getByEmailIncludingDeleted,
  update,
  recordTwoFactorFailure,
  count,
  find,
  insert,
  toUserDBO,
  remove
};
