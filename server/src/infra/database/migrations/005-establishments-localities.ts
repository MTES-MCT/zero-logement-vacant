import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('establishments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.integer('epci_id');
      table.string('name').notNullable();
      table.specificType('localities_id', 'uuid[]').notNullable();
      table.specificType('housing_scopes', 'text[]');
      table.boolean('available').defaultTo(false);
    }),
    knex.schema.createTable('localities', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('geo_code').notNullable();
      table.string('name').notNullable();
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table
        .uuid('establishment_id')
        .references('id')
        .inTable('establishments')
        .notNullable();
    }),
    knex.schema.alterTable('housing', (table) => {
      table.string('housing_scope');
    }),
    knex.schema.table('campaigns', function (table) {
      table.index(['establishment_id'], 'campaigns_establishment_idx');
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.table('campaigns', function (table) {
      table.dropIndex(['establishment_id'], 'campaigns_establishment_idx');
    }),
    knex.schema.alterTable('housing', (table) => {
      table.dropColumn('housing_scope');
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.dropColumn('establishment_id');
    }),
    knex.schema.dropTable('localities'),
    knex.schema.dropTable('establishments')
  ]);
}
