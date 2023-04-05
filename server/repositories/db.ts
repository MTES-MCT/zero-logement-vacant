import knex, { Knex } from 'knex';
import knexConfig from '../knex';

export const notDeleted: Knex.QueryCallback = (builder) =>
  builder.whereNull('deleted_at');

export const likeUnaccent = (column: string, query: string) => {
  return knex(knexConfig).raw(
    `upper(unaccent(${column})) like '%' || upper(unaccent(?)) || '%'`,
    query
  );
};

export async function countQuery(query: Knex.QueryInterface): Promise<number> {
  const result = await query.count().first();
  return Number(result.count);
}

export default knex(knexConfig);
// .on( 'query', function( queryData ) {
//     console.log( queryData );
// });
