import db from './db';
import { UserApi } from '../models/UserApi';

export const usersTable = 'users';

const getByEmail = async (email: string): Promise<UserApi> => {
    try {
        return db(usersTable)
            .where('email', email)
            .first()
            .then(result => {
                if (result) {
                    return <UserApi>{
                        id: result.id,
                        email: result.email,
                        password: result.password,
                        firstName: result.first_name,
                        lastName: result.last_name,
                        establishmentId: result.establishment_id
                    }
                } else {
                    console.error('User not found', email);
                    throw Error('User not found')
                }
            })
    } catch (err) {
        console.error('Getting user by email failed', err, email);
        throw new Error('Getting user by email failed');
    }
}

export default {
    getByEmail
}
