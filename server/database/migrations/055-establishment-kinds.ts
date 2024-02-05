import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema
    .alterTable('establishments', (table) => {
      table.string('kind');
    })
    .then(() =>
      Promise.all([
        knex
          .table('establishments')
          .update({ kind: 'Commune' })
          .whereNull('kind')
          .andWhereRaw('array_length(localities_geo_code, 1) = 1'),
        knex
          .table('establishments')
          .update({ kind: 'EPCI' })
          .whereNull('kind')
          .andWhereRaw('array_length(localities_geo_code, 1) > 1')
          .andWhereRaw("name not like 'DDT%'"),
        knex
          .table('establishments')
          .update({ kind: knex.raw("split_part(name, ' ', 1)") })
          .whereNull('kind')
          .andWhereRaw('array_length(localities_geo_code, 1) > 1')
          .andWhereRaw("name like 'DDT%'"),
      ])
    );
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('kind');
  });
};
