import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw('CREATE EXTENSION IF NOT EXISTS "plpgsql";'),
    knex.raw('CREATE EXTENSION IF NOT EXISTS "postgis";'),
    knex.schema.createTable('housing_scopes_geom', (table) => {
      table.specificType('gid', 'serial').primary();
      table.integer('fid');
      table.string('name');
      table.string('descriptio');
      table.string('nom');
      table.integer('nb_com');
      table.string('type');
      table.string('operateur');
      table.string('debut');
      table.string('fin');
      table.string('export');
      table.string('dispositif');
      table.specificType('geom', 'geometry(MultiPolygon, 4326)');
    }),
    knex.schema.table('housing_scopes_geom', function (table) {
      table.index(['geom'], 'housing_scopes_geom_idx', 'gist');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([knex.schema.dropTable('housing_scopes_geom')]);
}
