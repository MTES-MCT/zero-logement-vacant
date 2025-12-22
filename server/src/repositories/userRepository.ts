import type { TimePerWeek, UserFilters, UserEstablishment } from '@zerologementvacant/models';
import { Knex } from 'knex';

import db, { notDeleted } from '~/infra/database';
import { logger } from '~/infra/logger';
import { PaginationApi, paginationQuery } from '~/models/PaginationApi';
import { UserApi } from '~/models/UserApi';

export const usersTable = 'users';
export const usersEstablishmentsTable = 'users_establishments';

export const Users = (transaction = db) => transaction<UserDBO>(usersTable);

async function get(id: string): Promise<UserApi | null> {
  logger.debug('Get user by id', id);

  const result = await Users()
    .where(`${usersTable}.id`, id)
    .andWhere(notDeleted)
    .first();

  return result ? parseUserApi(result) : null;
}

async function getByEmail(email: string): Promise<UserApi | null> {
  logger.debug('Get user by email', email);

  const result = await Users()
    .whereRaw('upper(email) = upper(?)', email)
    .andWhere(notDeleted)
    .first();

  return result ? parseUserApi(result) : null;
}

async function getByEmailIncludingDeleted(email: string): Promise<UserApi | null> {
  logger.debug('Get user by email (including deleted)', email);

  const result = await Users()
    .whereRaw('upper(email) = upper(?)', email)
    .first();

  return result ? parseUserApi(result) : null;
}

async function update(user: UserApi): Promise<void> {
  logger.debug('Updating user...', { id: user.id });
  await Users().where({ id: user.id }).update(formatUserApi(user));
}

async function insert(userApi: UserApi): Promise<UserApi> {
  logger.info('Insert user with email', userApi.email);
  return db(usersTable)
    .insert(formatUserApi(userApi))
    .returning('*')
    .then((_) => parseUserApi(_[0]));
}

interface FindOptions {
  filters?: UserFilters;
  pagination?: PaginationApi;
}

async function find(opts?: FindOptions): Promise<UserApi[]> {
  const users: UserDBO[] = await db<UserDBO>(usersTable)
    .where(notDeleted)
    .modify((builder) => {
      if (opts?.filters?.establishments?.length) {
        builder.whereIn('establishment_id', opts.filters.establishments);
      }
    })
    // TODO: flexible sort
    .orderBy(['last_name', 'first_name'])
    .modify(paginationQuery(opts?.pagination));

  return users.map(parseUserApi);
}

interface CountOptions {
  filters?: UserFilters;
}

function filter(filters?: UserFilters) {
  return (builder: Knex.QueryBuilder<UserDBO>) => {
    if (filters?.establishments?.length) {
      builder.whereIn('establishment_id', filters.establishments);
    }
  };
}

async function count(opts?: CountOptions): Promise<number> {
  const result = await db<UserDBO>(usersTable)
    .where(notDeleted)
    .modify(filter(opts?.filters))
    .count('id')
    .first();

  return Number(result?.count);
}

async function remove(userId: string): Promise<void> {
  logger.info('Remove user', userId);
  await db(usersTable).where('id', userId).update({ deleted_at: new Date() });
}

// ============================================================================
// User Establishments (multi-structure support)
// ============================================================================

export const UsersEstablishments = (transaction = db) =>
  transaction<UserEstablishmentDBO>(usersEstablishmentsTable);

export interface UserEstablishmentDBO {
  user_id: string;
  establishment_id: string;
  establishment_siren: string;
  has_commitment: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Get all authorized establishments for a user
 */
async function getAuthorizedEstablishments(userId: string): Promise<UserEstablishment[]> {
  logger.debug('Get authorized establishments for user', userId);

  const results = await UsersEstablishments()
    .where('user_id', userId)
    .orderBy('created_at', 'asc');

  return results.map(parseUserEstablishment);
}

/**
 * Set authorized establishments for a user (replaces existing)
 */
async function setAuthorizedEstablishments(
  userId: string,
  establishments: Array<{
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }>
): Promise<void> {
  logger.info('Setting authorized establishments for user', {
    userId,
    count: establishments.length
  });

  await db.transaction(async (trx) => {
    // Remove existing entries
    await UsersEstablishments(trx).where('user_id', userId).delete();

    // Insert new entries
    if (establishments.length > 0) {
      const now = new Date();
      await UsersEstablishments(trx).insert(
        establishments.map((e) => ({
          user_id: userId,
          establishment_id: e.establishmentId,
          establishment_siren: e.establishmentSiren,
          has_commitment: e.hasCommitment,
          created_at: now,
          updated_at: now
        }))
      );
    }
  });
}

/**
 * Add an authorized establishment for a user (upsert)
 */
async function addAuthorizedEstablishment(
  userId: string,
  establishment: {
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }
): Promise<void> {
  logger.info('Adding authorized establishment for user', {
    userId,
    establishmentId: establishment.establishmentId
  });

  const now = new Date();
  await db.raw(
    `
    INSERT INTO ${usersEstablishmentsTable} (user_id, establishment_id, establishment_siren, has_commitment, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, establishment_id)
    DO UPDATE SET has_commitment = EXCLUDED.has_commitment, updated_at = EXCLUDED.updated_at
    `,
    [
      userId,
      establishment.establishmentId,
      establishment.establishmentSiren,
      establishment.hasCommitment,
      now,
      now
    ]
  );
}

/**
 * Check if user has access to a specific establishment
 */
async function hasAccessToEstablishment(
  userId: string,
  establishmentId: string
): Promise<boolean> {
  const result = await UsersEstablishments()
    .where({ user_id: userId, establishment_id: establishmentId })
    .first();

  return !!result;
}

/**
 * Check if user is multi-structure (has access to more than one establishment with commitment)
 */
async function isMultiStructure(userId: string): Promise<boolean> {
  const result = await UsersEstablishments()
    .where({ user_id: userId, has_commitment: true })
    .count('establishment_id as count')
    .first();

  return Number(result?.count) > 1;
}

const parseUserEstablishment = (dbo: UserEstablishmentDBO): UserEstablishment => ({
  establishmentId: dbo.establishment_id,
  establishmentSiren: dbo.establishment_siren,
  hasCommitment: dbo.has_commitment
});

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

export const parseUserApi = (userDBO: UserDBO): UserApi => ({
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

export const formatUserApi = (userApi: UserApi): UserDBO => ({
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
  count,
  find,
  insert,
  formatUserApi,
  remove,
  // Multi-structure support
  getAuthorizedEstablishments,
  setAuthorizedEstablishments,
  addAuthorizedEstablishment,
  hasAccessToEstablishment,
  isMultiStructure
};
