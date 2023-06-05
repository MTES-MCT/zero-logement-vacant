import highland from 'highland';

import db, { notDeleted } from './db';
import { UserApi, UserRoles } from '../models/UserApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { PaginationApi, paginationQuery } from '../models/PaginationApi';

export const usersTable = 'users';

const Users = () => db<UserDBO>(usersTable);

const get = async (id: string): Promise<UserApi | null> => {
  console.log('Get user by id', id);

  const result = await Users()
    .where(`${usersTable}.id`, id)
    .andWhere(notDeleted)
    .first();

  return result ? parseUserApi(result) : null;
};

const getByEmail = async (email: string): Promise<UserApi | null> => {
  console.log('Get user by email', email);

  const result = await Users()
    .whereRaw('upper(email) = upper(?)', email)
    .andWhere(notDeleted)
    .first();

  return result ? parseUserApi(result) : null;
};

const update = async (userApi: UserApi): Promise<void> => {
  console.log('Update userApi with id', userApi.id);
  await Users()
    .update(formatUserApi(userApi))
    .where('id', userApi.id)
    .debug(true);
};

const insert = async (userApi: UserApi): Promise<UserApi> => {
  console.log('Insert user with email', userApi.email);
  try {
    return db(usersTable)
      .insert(formatUserApi(userApi))
      .returning('*')
      .then((_) => parseUserApi(_[0]));
  } catch (err) {
    console.error('Inserting user failed', err, userApi);
    throw new Error('Inserting user failed');
  }
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

const listWithFilters = async (
  filters: UserFiltersApi,
  filtersForTotalCount: UserFiltersApi,
  pagination: PaginationApi
): Promise<PaginatedResultApi<UserApi>> => {
  try {
    const filter = (filters: UserFiltersApi) => (queryBuilder: any) => {
      if (filters.establishmentIds?.length) {
        queryBuilder.whereIn('establishment_id', filters.establishmentIds);
      }
    };

    const filteredCount: number = await db(usersTable)
      .where(notDeleted)
      .modify(filter(filters))
      .count('id')
      .first()
      .then((_) => Number(_.count));

    const totalCount: number = await db(usersTable)
      .where(notDeleted)
      .modify(filter(filtersForTotalCount))
      .count('id')
      .first()
      .then((_) => Number(_?.count));

    const results = await db(usersTable)
      .where(notDeleted)
      .modify((queryBuilder: any) => {
        queryBuilder.orderBy('last_name');
        queryBuilder.orderBy('first_name');
      })
      .modify(paginationQuery(pagination))
      .modify(filter(filters));

    return <PaginatedResultApi<UserApi>>{
      entities: results.map((result: any) => parseUserApi(result)),
      filteredCount,
      totalCount,
      page: pagination.paginate ? pagination.page : 1,
      perPage: pagination.paginate ? pagination.perPage : filteredCount,
    };
  } catch (err) {
    console.error('Listing users failed', err);
    throw new Error('Listing users failed');
  }
};

const remove = async (userId: string): Promise<void> => {
  console.log('Remove user', userId);
  try {
    await db(usersTable).where('id', userId).update({ deleted_at: new Date() });
  } catch (err) {
    console.error('Removing user failed', err, userId);
    throw new Error('Removing user failed');
  }
};

interface UserDBO {
  id: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  establishment_id?: string;
  role: number;
  activated_at?: Date;
  last_authenticated_at?: Date;
  deleted_at?: Date;
  updated_at?: Date;
  phone?: string;
  position?: string;
  time_per_week?: string;
}

const parseUserApi = (userDBO: UserDBO): UserApi => ({
  id: userDBO.id,
  email: userDBO.email,
  password: userDBO.password,
  firstName: userDBO.first_name,
  lastName: userDBO.last_name,
  establishmentId: userDBO.establishment_id,
  role: userDBO.role,
  activatedAt: userDBO.activated_at,
  lastAuthenticatedAt: userDBO.last_authenticated_at,
  deletedAt: userDBO.deleted_at,
  updatedAt: userDBO.updated_at,
  phone: userDBO.phone,
  position: userDBO.position,
  timePerWeek: userDBO.time_per_week,
});

const formatUserApi = (userApi: UserApi): UserDBO => ({
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
  listWithFilters,
  stream,
  insert,
  formatUserApi,
  remove,
};
