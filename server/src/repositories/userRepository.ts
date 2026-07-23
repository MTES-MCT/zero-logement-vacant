import type { TimePerWeek, UserFilters } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';
import {
  isPaginationEnabled,
  type PaginationApi
} from '~/models/PaginationApi';
import { UserApi } from '~/models/UserApi';

export const USERS_TABLE = 'users';

export const Users = (transaction = db) => transaction<UserDBO>(USERS_TABLE);

async function get(id: string): Promise<UserApi | null> {
  logger.debug('Get user by id', id);

  const row = await kysely
    .selectFrom('users')
    .selectAll()
    .where('id', '=', id)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  return row ? parseUserRow(row) : null;
}

async function getByEmail(email: string): Promise<UserApi | null> {
  logger.debug('Get user by email', email);

  const row = await kysely
    .selectFrom('users')
    .selectAll()
    .where(sql<boolean>`upper(email) = upper(${email})`)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  return row ? parseUserRow(row) : null;
}

async function getByEmailIncludingDeleted(
  email: string
): Promise<UserApi | null> {
  logger.debug('Get user by email (including deleted)', email);

  const row = await kysely
    .selectFrom('users')
    .selectAll()
    .where(sql<boolean>`upper(email) = upper(${email})`)
    .executeTakeFirst();

  return row ? parseUserRow(row) : null;
}

async function update(user: UserApi): Promise<void> {
  logger.debug('Updating user...', { id: user.id });
  await kysely
    .updateTable('users')
    .set(toUserUpdate(user))
    .where('id', '=', user.id)
    .execute();
}

async function updateEstablishment(
  userId: string,
  establishmentId: string
): Promise<void> {
  await kysely
    .updateTable('users')
    .set({ establishmentId, updatedAt: new Date() })
    .where('id', '=', userId)
    .execute();
}

async function recordTwoFactorFailure(
  userId: string,
  maximumAttempts: number,
  lockedUntil: Date
): Promise<void> {
  await kysely
    .updateTable('users')
    .set({
      twoFactorFailedAttempts: sql`two_factor_failed_attempts + 1`,
      twoFactorLockedUntil: sql`
        CASE
          WHEN two_factor_failed_attempts + 1 >= ${maximumAttempts}
          THEN COALESCE(two_factor_locked_until, ${lockedUntil})
          ELSE two_factor_locked_until
        END`,
      updatedAt: new Date()
    })
    .where('id', '=', userId)
    .execute();
}

async function insert(userApi: UserApi): Promise<UserApi> {
  logger.info('Insert user with email', userApi.email);
  const row = await kysely
    .insertInto('users')
    .values({ ...toUserInsert(userApi), password: null })
    .returningAll()
    .executeTakeFirstOrThrow();
  return parseUserRow(row);
}

interface FindOptions {
  filters?: UserFilters;
  pagination?: PaginationApi;
}

async function find(opts?: FindOptions): Promise<UserApi[]> {
  const establishmentIds = opts?.filters?.establishments;
  // paginationQuery() defaulted to { page: 1, perPage: 50 } when no
  // pagination was provided, so unpaginated find() calls were still capped
  // at 50 rows.
  const pagination: PaginationApi = opts?.pagination ?? {
    paginate: true,
    page: 1,
    perPage: 50
  };
  const paginationParams = isPaginationEnabled(pagination)
    ? {
        limit: pagination.perPage,
        offset: (pagination.page - 1) * pagination.perPage
      }
    : null;

  const rows = await kysely
    .selectFrom('users')
    .selectAll('users')
    .where('users.deletedAt', 'is', null)
    .$if(!!establishmentIds?.length, (query) =>
      query
        // Plain DISTINCT over the whole (users.*-only) select list — not
        // DISTINCT ON — mirrors the original Knex `.distinct('users.id')`,
        // which Knex translates to a plain SELECT DISTINCT rather than
        // Postgres's DISTINCT ON.
        .distinct()
        .innerJoin('usersEstablishments', (join) =>
          join
            .onRef('usersEstablishments.userId', '=', 'users.id')
            .on(
              'usersEstablishments.establishmentId',
              'in',
              establishmentIds ?? []
            )
            .on('usersEstablishments.hasCommitment', '=', true)
        )
    )
    .orderBy('users.lastName')
    .orderBy('users.firstName')
    .$if(!!paginationParams, (query) =>
      query
        .limit(paginationParams?.limit ?? 0)
        .offset(paginationParams?.offset ?? 0)
    )
    .execute();

  return rows.map(parseUserRow);
}

interface CountOptions {
  filters?: UserFilters;
}

async function count(opts?: CountOptions): Promise<number> {
  const establishmentIds = opts?.filters?.establishments;

  const result = await kysely
    .selectFrom('users')
    .where('users.deletedAt', 'is', null)
    .$if(!!establishmentIds?.length, (query) =>
      query.innerJoin('usersEstablishments', (join) =>
        join
          .onRef('usersEstablishments.userId', '=', 'users.id')
          .on(
            'usersEstablishments.establishmentId',
            'in',
            establishmentIds ?? []
          )
          .on('usersEstablishments.hasCommitment', '=', true)
      )
    )
    .select((eb) => eb.fn.count<string>('users.id').distinct().as('count'))
    .executeTakeFirst();

  return Number(result?.count ?? 0);
}

async function remove(userId: string): Promise<void> {
  logger.info('Remove user', userId);
  const deletedAt = new Date();

  await withinKyselyTransaction(async (trx) => {
    await trx.deleteFrom('session').where('userId', '=', userId).execute();
    await trx.deleteFrom('account').where('userId', '=', userId).execute();
    await trx.deleteFrom('authUsers').where('id', '=', userId).execute();
    await trx
      .updateTable('users')
      .set({ deletedAt, updatedAt: deletedAt })
      .where('id', '=', userId)
      .execute();
  });
}

export interface UserDBO {
  id: string;
  email: string;
  /** Legacy cutover source. Runtime authentication uses account.password. */
  password: string | null;
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
  password: userDBO.password ?? '',
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

// ---------------------------------------------------------------------------
// Row parsers / write mappers for the Kysely read/write path. Field-for-field
// mirrors of fromUserDBO/toUserDBO (which stay snake_case, for the legacy
// Knex accessor used by seeds/tests/other repos' backward compat), just
// reading/writing the already-camelCase Kysely shape directly instead of
// bridging through snake_case.
// ---------------------------------------------------------------------------

type UserRow = Selectable<DB['users']>;

function parseUserRow(row: UserRow): UserApi {
  return {
    id: row.id,
    email: row.email,
    password: row.password ?? '',
    firstName: row.firstName,
    lastName: row.lastName,
    establishmentId: row.establishmentId,
    role: row.role,
    activatedAt: new Date(row.activatedAt).toJSON(),
    lastAuthenticatedAt: row.lastAuthenticatedAt
      ? new Date(row.lastAuthenticatedAt).toJSON()
      : null,
    suspendedAt: row.suspendedAt ? new Date(row.suspendedAt).toJSON() : null,
    suspendedCause: row.suspendedCause,
    deletedAt: row.deletedAt ? new Date(row.deletedAt).toJSON() : null,
    updatedAt: new Date(row.updatedAt).toJSON(),
    phone: row.phone,
    position: row.position,
    timePerWeek: row.timePerWeek as TimePerWeek | null,
    kind: row.kind,
    twoFactorSecret: row.twoFactorSecret,
    twoFactorEnabledAt: row.twoFactorEnabledAt
      ? new Date(row.twoFactorEnabledAt).toJSON()
      : null,
    twoFactorCode: row.twoFactorCode,
    twoFactorCodeGeneratedAt: row.twoFactorCodeGeneratedAt
      ? new Date(row.twoFactorCodeGeneratedAt).toJSON()
      : null,
    twoFactorFailedAttempts: row.twoFactorFailedAttempts,
    twoFactorLockedUntil: row.twoFactorLockedUntil
      ? new Date(row.twoFactorLockedUntil).toJSON()
      : null
  };
}

function toUserInsert(userApi: UserApi) {
  return {
    id: userApi.id,
    email: userApi.email,
    password: userApi.password,
    firstName: userApi.firstName,
    lastName: userApi.lastName,
    establishmentId: userApi.establishmentId,
    role: userApi.role,
    activatedAt: new Date(userApi.activatedAt),
    lastAuthenticatedAt: userApi.lastAuthenticatedAt
      ? new Date(userApi.lastAuthenticatedAt)
      : null,
    suspendedAt: userApi.suspendedAt ? new Date(userApi.suspendedAt) : null,
    suspendedCause: userApi.suspendedCause,
    deletedAt: userApi.deletedAt ? new Date(userApi.deletedAt) : null,
    updatedAt: new Date(userApi.updatedAt),
    phone: userApi.phone,
    position: userApi.position,
    timePerWeek: userApi.timePerWeek,
    kind: userApi.kind,
    twoFactorSecret: userApi.twoFactorSecret,
    twoFactorEnabledAt: userApi.twoFactorEnabledAt
      ? new Date(userApi.twoFactorEnabledAt)
      : null,
    twoFactorCode: userApi.twoFactorCode,
    twoFactorCodeGeneratedAt: userApi.twoFactorCodeGeneratedAt
      ? new Date(userApi.twoFactorCodeGeneratedAt)
      : null,
    twoFactorFailedAttempts: userApi.twoFactorFailedAttempts,
    twoFactorLockedUntil: userApi.twoFactorLockedUntil
      ? new Date(userApi.twoFactorLockedUntil)
      : null
  };
}

// update() never writes `password` — auth-v2 owns credentials via
// account.password; this legacy field must never round-trip back in.
function toUserUpdate(userApi: UserApi) {
  const { password: _legacyPassword, id: _id, ...rest } = toUserInsert(userApi);
  return rest;
}

export default {
  get,
  getByEmail,
  getByEmailIncludingDeleted,
  update,
  updateEstablishment,
  recordTwoFactorFailure,
  count,
  find,
  insert,
  toUserDBO,
  remove
};
