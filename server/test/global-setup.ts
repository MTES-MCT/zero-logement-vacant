import knex from 'knex';
import knexConfig from '../knex';

export default async () => {

    const db = knex(knexConfig)

    try {
        await db.migrate.latest()
        await db.seed.run()
        console.log('Test database created successfully')
    } catch (error: any) {
        console.log(error)
        process.exit(1)
    } finally {
        await db.destroy()
    }
}
