import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('establishments', (table) => {
      table.specificType('localities_geo_code', 'text[]');
    }),
    knex.raw(
      'update establishments e set localities_geo_code = (select array_agg(l.geo_code) from localities l where l.id = any(e.localities_id))',
    ),
  ]);
  await knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('localities_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('establishments', (table) => {
      table.specificType('localities_id', 'uuid[]');
    }),
    knex.raw(
      'update establishments e set localities_id = (select array_agg(l.id) from localities l where l.geo_code = any(e.localities_geo_code))',
    ),
  ]).then(() => {
    knex.schema.alterTable('establishments', (table) => {
      table.dropColumn('localities_geo_code');
    });
  });
}
