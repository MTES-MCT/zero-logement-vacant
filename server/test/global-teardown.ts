import knex from 'knex';
import knexConfig from '../knex';

export default async () => {

    const db = knex(knexConfig)

    try {
        await db.migrate.rollback()
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}
