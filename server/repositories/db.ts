import knex, { Knex } from 'knex';
import knexConfig from '../knex';

export const notDeleted: Knex.QueryCallback = (builder) =>
  builder.whereNull('deleted_at')

export default knex(knexConfig)
    // .on( 'query', function( queryData ) {
    //     console.log( queryData );
    // });
