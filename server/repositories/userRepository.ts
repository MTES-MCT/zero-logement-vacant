import highland from 'highland';

import db, { notDeleted } from './db';
import { UserApi, UserRoles } from '../models/UserApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { PaginationApi, paginationQuery } from '../models/PaginationApi';
import { Knex } from 'knex';
import { logger } from '../utils/logger';

export const usersTable = 'users';

export const Users = () => db<UserDBO>(usersTable);

const get = async (id: string): Promise<UserApi | null> => {
  logger.debug('Get user by id', id);

  const result = await Users()
    .where(`${usersTable}.id`, id)
    .andWhere(notDeleted)
    .first();

  return result ? parseUserApi(result) : null;
};

const getByEmail = async (email: string): Promise<UserApi | null> => {
  logger.debug('Get user by email', email);

  const result = await Users()
    .whereRaw('upper(email) = upper(?)', email)
    .andWhere(notDeleted)
    .first();

  return result ? parseUserApi(result) : null;
};

const update = async (userApi: UserApi): Promise<void> => {
  logger.info('Update userApi with id', userApi.id);
  await Users()
    .update(formatUserApi(userApi))
    .where('id', userApi.id)
    .debug(true);
};

const insert = async (userApi: UserApi): Promise<UserApi> => {
  logger.info('Insert user with email', userApi.email);
  return db(usersTable)
    .insert(formatUserApi(userApi))
    .returning('*')
    .then((_) => parseUserApi(_[0]));
};

interface StreamOptions {
  roles?: UserRoles[];
  updatedAfter?: Date;
}

const stream = (options?: StreamOptions) => {
  const stream = Users()
    .orderBy('email')
    .modify((query) => {
      if (options?.updatedAfter) {
        query.andWhere('updated_at', '>', options.updatedAfter);
      }
      if (options?.roles?.length) {
        query.andWhere('role', 'IN', options.roles);
      }
    })
    .stream();
  return highland(stream).map((_) => parseUserApi(_ as UserDBO));
};

interface FindOptions {
  filters?: UserFiltersApi;
  pagination?: PaginationApi;
}

const find = async (opts?: FindOptions): Promise<UserApi[]> => {
  const users: UserDBO[] = await db<UserDBO>(usersTable)
    .where(notDeleted)
    .modify((builder) => {
      if (opts?.filters?.establishmentIds?.length) {
        builder.whereIn('establishment_id', opts.filters.establishmentIds);
      }
    })
    // TODO: flexible sort
    .orderBy(['last_name', 'first_name'])
    .modify(paginationQuery(opts?.pagination));

  return users.map(parseUserApi);
};

interface CountOptions {
  filters?: UserFiltersApi;
}

function filter(filters?: UserFiltersApi) {
  return (builder: Knex.QueryBuilder<UserDBO>) => {
    if (filters?.establishmentIds?.length) {
      builder.whereIn('establishment_id', filters.establishmentIds);
    }
  };
}

const count = async (opts?: CountOptions): Promise<number> => {
  const result = await db<UserDBO>(usersTable)
    .where(notDeleted)
    .modify(filter(opts?.filters))
    .count('id')
    .first();

  return Number(result?.count);
};

const remove = async (userId: string): Promise<void> => {
  logger.info('Remove user', userId);
  await db(usersTable).where('id', userId).update({ deleted_at: new Date() });
};

export interface UserDBO {
  id: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  establishment_id?: string;
  role: number;
  activated_at?: Date | string;
  last_authenticated_at?: Date | string;
  deleted_at?: Date | string;
  updated_at?: Date | string;
  phone?: string;
  position?: string;
  time_per_week?: string;
}

export const parseUserApi = (userDBO: UserDBO): UserApi => ({
  id: userDBO.id,
  email: userDBO.email,
  password: userDBO.password,
  firstName: userDBO.first_name,
  lastName: userDBO.last_name,
  establishmentId: userDBO.establishment_id,
  role: userDBO.role,
  activatedAt: userDBO.activated_at
    ? new Date(userDBO.activated_at)
    : undefined,
  lastAuthenticatedAt: userDBO.last_authenticated_at
    ? new Date(userDBO.last_authenticated_at)
    : undefined,
  deletedAt: userDBO.deleted_at ? new Date(userDBO.deleted_at) : undefined,
  updatedAt: userDBO.updated_at ? new Date(userDBO.updated_at) : undefined,
  phone: userDBO.phone,
  position: userDBO.position,
  timePerWeek: userDBO.time_per_week,
});

export const formatUserApi = (userApi: UserApi): UserDBO => ({
  id: userApi.id,
  email: userApi.email,
  password: userApi.password,
  first_name: userApi.firstName,
  last_name: userApi.lastName,
  establishment_id: userApi.establishmentId,
  role: userApi.role,
  activated_at: userApi.activatedAt ? new Date(userApi.activatedAt) : undefined,
  last_authenticated_at: userApi.lastAuthenticatedAt
    ? new Date(userApi.lastAuthenticatedAt)
    : undefined,
  deleted_at: userApi.deletedAt ? new Date(userApi.deletedAt) : undefined,
  updated_at: userApi.updatedAt ? new Date(userApi.updatedAt) : undefined,
  phone: userApi.phone,
  position: userApi.position,
  time_per_week: userApi.timePerWeek,
});

export default {
  get,
  getByEmail,
  update,
  count,
  find,
  stream,
  insert,
  formatUserApi,
  remove,
};
