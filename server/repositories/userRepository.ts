import db, { notDeleted } from './db';
import { UserApi } from '../models/UserApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import UserNotFoundError from "../errors/user-not-found-error";

export const usersTable = 'users';

const get = async (id: string): Promise<UserApi> => {
    try {
        return db(usersTable)
            .where(`${usersTable}.id`, id)
            .andWhere(notDeleted)
            .first()
            .then(result => {
                if (result) {
                    return parseUserApi(result);
                } else {
                    console.error('User not found', id);
                    throw new UserNotFoundError();
                }
            })
    } catch (err) {
        console.error('Getting user by id failed', err, id);
        throw new Error('Getting user by id failed');
    }
}

const getByEmail = async (email: string): Promise<UserApi> => {
    try {
        return db(usersTable)
            .whereRaw('upper(email) = upper(?)', email)
            .andWhere(notDeleted)
            .first()
            .then(result => {
                if (result) {
                    return parseUserApi(result);
                } else {
                    console.error('User not found', email);
                    throw new UserNotFoundError();
                }
            })
    } catch (err) {
        console.error('Getting user by email failed', err, email);
        throw new Error('Getting user by email failed');
    }
}

const updatePassword = async (userId: string, password: string): Promise<any> => {
    try {
        return db(usersTable)
            .update({password})
            .where('id', userId)
    } catch (err) {
        console.error('Updating password failed', err, userId);
        throw new Error('Updating password failed');
    }
}

const updateLastAuthentication = async (userId: string): Promise<any> => {
    try {
        return db(usersTable)
            .update({last_authenticated_at: new Date()})
            .where('id', userId)
    } catch (err) {
        console.error('Updating last authentication failed', err, userId);
        throw new Error('Updating authentication failed');
    }
}

const activate = async (userId: string): Promise<any> => {
    try {
        return db(usersTable)
            .update({activated_at: new Date()})
            .where('id', userId)
    } catch (err) {
        console.error('Updating password failed', err, userId);
        throw new Error('Updating password failed');
    }
}

const insert = async (userApi: UserApi): Promise<UserApi> => {

    console.log('Insert user with email', userApi.email)
    try {
        return db(usersTable)
            .insert(formatUserApi(userApi))
            .returning('*')
            .then(_ => parseUserApi(_[0]))
    } catch (err) {
        console.error('Inserting user failed', err, userApi);
        throw new Error('Inserting user failed');
    }
}

const listWithFilters = async (filters: UserFiltersApi, page?: number, perPage?: number): Promise<PaginatedResultApi<UserApi>> => {
    try {
        const filter = (queryBuilder: any) => {
            if (filters.establishmentIds?.length) {
                queryBuilder.whereIn('establishment_id', filters.establishmentIds)
            }
        }


        const housingCount: number = await
            db(usersTable)
                .count('id')
                .modify(filter)
                .where(notDeleted)
                .then(_ => Number(_[0].count))

        const results = await db(usersTable)
            .where(notDeleted)
            .modify((queryBuilder: any) => {
                queryBuilder.orderBy('last_name')
                queryBuilder.orderBy('first_name')
                if (page && perPage) {
                    queryBuilder
                        .offset((page - 1) * perPage)
                        .limit(perPage)
                }
            })
            .modify(filter)

        return <PaginatedResultApi<UserApi>> {
            entities: results.map((result: any) => parseUserApi(result)),
            totalCount: housingCount,
            page,
            perPage
        }
    } catch (err) {
        console.error('Listing users failed', err);
        throw new Error('Listing users failed');
    }
}

const remove = async (userId: string): Promise<void> => {

    console.log('Remove user', userId)
    try {
        await db(usersTable)
          .where('id', userId)
          .update({ 'deleted_at': new Date() })
    } catch (err) {
        console.error('Removing user failed', err, userId)
        throw new Error('Removing user failed')
    }
}

const parseUserApi = (result: any) => <UserApi>{
    id: result.id,
    email: result.email,
    password: result.password,
    firstName: result.first_name,
    lastName: result.last_name,
    establishmentId: result.establishment_id,
    role: result.role,
    activatedAt: result.activated_at,
}

const formatUserApi = (userApi: UserApi) => ({
    id: userApi.id,
    email: userApi.email,
    password: userApi.password,
    first_name: userApi.firstName,
    last_name: userApi.lastName,
    establishment_id: userApi.establishmentId,
    role: userApi.role,
    activated_at: userApi.activatedAt ? new Date(userApi.activatedAt) : undefined,
})

export default {
    get,
    getByEmail,
    updatePassword,
    updateLastAuthentication,
    listWithFilters,
    insert,
    activate,
    formatUserApi,
    remove
}
