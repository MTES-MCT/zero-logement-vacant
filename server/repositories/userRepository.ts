import db from './db';
import { UserApi } from '../models/UserApi';
import { localitiesTable } from './localityRepository';

export const usersTable = 'users';
export const establishmentsTable = 'establishments';


const getByEmail = async (email: string): Promise<UserApi> => {
    try {
        return db
            .select(
                `${usersTable}.*`,
                'e.id as establishment_id',
                'e.name as establishment_name',
                'e.housing_scopes as establishment_housing_scopes',
                db.raw('json_agg(json_build_object(\'geo_code\', l.geo_code, \'name\', l.name)) as establishment_localities')
            )
            .from(usersTable)
            .where('email', email)
            .join(`${establishmentsTable} as e`, `e.id`, `${usersTable}.establishment_id`)
            .join(`${localitiesTable} as l`, `e.id`, `l.establishment_id`)
            .groupBy(`${usersTable}.id`, 'e.id')
            .first()
            .then(result => {
                if (result) {
                    return <UserApi>{
                        id: result.id,
                        email: result.email,
                        password: result.password,
                        firstName: result.first_name,
                        lastName: result.last_name,
                        establishment: {
                            id: result.establishment_id,
                            name: result.establishment_name,
                            housingScopes: result.establishment_housing_scopes,
                            localities: result.establishment_localities.map((l: { geo_code: any; name: any; }) => ({
                                geoCode: l.geo_code,
                                name: l.name
                            }))
                        }
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
