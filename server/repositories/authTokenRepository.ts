import db from './db';
import { AuthTokenApi } from '../models/UserApi';

export const authTokensTable = 'auth_tokens';

const get = async (id: string): Promise<AuthTokenApi> => {
    try {
        return db(authTokensTable)
            .where('id', id)
            .first()
            .then(result => {
                if (result) {
                    return <AuthTokenApi>{
                        id: result.id,
                        userId: result.user_id,
                        createdAt: result.created_at
                    }
                } else {
                    console.error('Auth token not found for id', id);
                    throw Error('Auth token not found')
                }
            })
    } catch (err) {
        console.error('Getting auth token failed', err, id);
        throw new Error('Getting auth token failed');
    }
}

const deleteToken = async (id: string): Promise<AuthTokenApi> => {
    try {
        return db(authTokensTable)
            .where('id', id)
            .delete()
    } catch (err) {
        console.error('Deleting auth token failed', err, id);
        throw new Error('Deleting auth token failed');
    }
}

const upsertUserToken = async (userId: string): Promise<AuthTokenApi> => {
    try {
        return db(authTokensTable)
            .insert({ user_id: userId })
            .onConflict('user_id')
            .merge({ created_at: new Date() })
            .returning('*')
            .then(result =>
                <AuthTokenApi>{
                    id: result[0].id,
                    userId: result[0].user_id,
                    createdAt: result[0].created_at
                }
            );
    } catch (err) {
        console.error('Getting user token failed', err, userId);
        throw new Error('Getting user token failed');
    }
}

export default {
    get,
    deleteToken,
    upsertUserToken
}
