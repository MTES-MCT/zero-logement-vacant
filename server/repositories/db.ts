import knex from 'knex';
import knexConfig from '../knex';

export default knex(knexConfig)
    // .on( 'query', function( queryData ) {
    //     console.log( queryData );
    // });
