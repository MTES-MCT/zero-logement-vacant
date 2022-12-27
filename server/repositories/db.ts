import knex, { Knex } from 'knex';
import knexConfig from '../knex';
import QueryCallback = Knex.QueryCallback;

export const notDeleted: QueryCallback = (builder) =>
  builder.whereNull('deleted_at');

export const likeUnaccent = (column: string, query: string) => {
  return knex(knexConfig).raw(
    `upper(unaccent(${column})) like '%' || upper(unaccent(?)) || '%'`,
    query
  );
};

export default knex(knexConfig);
// .on( 'query', function( queryData ) {
//     console.log( queryData );
// });
