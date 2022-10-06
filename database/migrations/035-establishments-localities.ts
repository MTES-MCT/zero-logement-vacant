import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = function(knex: Knex) {
    return Promise.all([
        knex.schema
            .alterTable('establishments', (table: CreateTableBuilder) => {
                table.specificType('localities_geo_code', 'text[]');
            }),
        knex.raw('update establishments e set localities_geo_code = (select array_agg(l.geo_code) from localities l where l.id = any(e.localities_id))')
    ]).then(() => {
        return knex.schema
            .alterTable('establishments', (table: CreateTableBuilder) => {
                table.dropColumn('localities_id');
            })
    });
};

exports.down = function(knex: Knex) {
  return Promise.all([
      knex.schema
          .alterTable('establishments', (table: CreateTableBuilder) => {
              table.specificType('localities_id', 'uuid[]');
          }),
      knex.raw('update establishments e set localities_id = (select array_agg(l.id) from localities l where l.geo_code = any(e.localities_geo_code))')
  ]).then(() => {
      knex.schema
          .alterTable('establishments', (table: CreateTableBuilder) => {
              table.dropColumn('localities_geo_code');
          })
  });
};
