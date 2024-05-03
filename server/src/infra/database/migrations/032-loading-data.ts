import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('localities', (table) => {
      table.unique('geo_code');
    }),
    knex.schema.alterTable('establishments', (table) => {
      table.unique('siren');
    }),
    knex.schema.alterTable('users', (table) => {
      table.unique('email');
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.uuid('created_by').nullable().alter();
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('localities', (table) => {
      table.dropUnique(['geo_code']);
    }),
    knex.schema.alterTable('establishments', (table) => {
      table.dropUnique(['siren']);
    }),
    knex.schema.alterTable('users', (table) => {
      table.dropUnique(['email']);
    }),
  ]);
}
