import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing_scopes_geom', (table) => {
      table.uuid('establishment_id').references('id').inTable('establishments');
      table.dropColumn('fid');
      table.dropColumn('descriptio');
      table.dropColumn('nom');
      table.dropColumn('nb_com');
      table.dropColumn('operateur');
      table.dropColumn('debut');
      table.dropColumn('fin');
      table.dropColumn('export');
      table.dropColumn('dispositif');
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing_scopes_geom', (table) => {
      table.integer('fid');
      table.string('descriptio');
      table.string('nom');
      table.integer('nb_com');
      table.string('operateur');
      table.string('debut');
      table.string('fin');
      table.string('export');
      table.string('dispositif');
      table.dropColumn('establishment_id');
    })
  ]);
}
