import highland from 'highland';

import db, { notDeleted } from './db';
import { UserApi, UserRoles } from '../models/UserApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { paginationQuery } from '../models/PaginationApi';
import { Paginated, Pagination } from '../../shared/models/Pagination';

export const usersTable = 'users';

const Users = () => db<UserDBO>(usersTable);

const get = async (id: string): Promise<UserApi | null> => {
  console.log('Get user by id', id);

  const result = await Users().where('id', id).andWhere(notDeleted).first();

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

const updatePassword = async (
  userId: string,
  password: string
): Promise<any> => {
  try {
    return Users().update({ password }).where('id', userId);
  } catch (err) {
    console.error('Updating password failed', err, userId);
    throw new Error('Updating password failed');
  }
};

const updateLastAuthentication = async (userId: string): Promise<any> => {
  try {
    return Users()
      .update({ last_authenticated_at: new Date() })
      .where('id', userId);
  } catch (err) {
    console.error('Updating last authentication failed', err, userId);
    throw new Error('Updating authentication failed');
  }
};

const activate = async (userId: string): Promise<any> => {
  try {
    return Users().update({ activated_at: new Date() }).where('id', userId);
  } catch (err) {
    console.error('Updating password failed', err, userId);
    throw new Error('Updating password failed');
  }
};

const insert = async (userApi: UserApi): Promise<void> => {
  console.log('Insert user with email', userApi.email);
  await Users().insert(formatUserApi(userApi));
};

interface StreamOptions {
  roles?: UserRoles[];
  updatedAfter?: Date;
}

const stream = (options?: StreamOptions) => {
  const stream = db(usersTable)
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
  return highland<UserDBO>(stream).map(parseUserApi);
};

const listWithFilters = async (
  filters: UserFiltersApi,
  filtersForTotalCount: UserFiltersApi,
  pagination: Required<Pagination>
): Promise<Paginated<UserApi>> => {
  try {
    const filter = (filters: UserFiltersApi) => (queryBuilder: any) => {
      if (filters.establishmentIds?.length) {
        queryBuilder.whereIn('establishment_id', filters.establishmentIds);
      }
    };

    const filteredCount: number = await Users()
      .where(notDeleted)
      .modify(filter(filters))
      .count('id')
      .first()
      .then((_) => Number(_.count));

    const totalCount: number = await Users()
      .where(notDeleted)
      .modify(filter(filtersForTotalCount))
      .count('id')
      .first()
      .then((_) => Number(_?.count));

    const results: UserDBO[] = await Users()
      .where(notDeleted)
      .modify((queryBuilder) => {
        queryBuilder.orderBy('last_name');
        queryBuilder.orderBy('first_name');
      })
      .modify(paginationQuery(pagination))
      .modify(filter(filters));

    return {
      entities: results.map(parseUserApi),
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

const remove = async (id: string): Promise<void> => {
  console.log('Remove user', id);
  await Users().where({ id }).update({ deleted_at: new Date() });
};

interface UserDBO {
  id: string;
  establishment_id?: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRoles;
  activated_at: Date;
  last_authenticated_at?: Date;
  deleted_at?: Date;
}

const parseUserApi = (result: UserDBO): UserApi => ({
  id: result.id,
  email: result.email,
  password: result.password,
  firstName: result.first_name,
  lastName: result.last_name,
  establishmentId: result.establishment_id,
  role: result.role,
  activatedAt: result.activated_at,
});

const formatUserApi = (userApi: UserApi): UserDBO => ({
  id: userApi.id,
  email: userApi.email,
  password: userApi.password,
  first_name: userApi.firstName,
  last_name: userApi.lastName,
  establishment_id: userApi.establishmentId,
  role: userApi.role,
  activated_at: userApi.activatedAt,
});

export default {
  get,
  getByEmail,
  updatePassword,
  updateLastAuthentication,
  listWithFilters,
  stream,
  insert,
  activate,
  formatUserApi,
  remove,
};
