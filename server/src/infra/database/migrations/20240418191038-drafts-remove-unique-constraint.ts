import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropUnique(['name', 'establishment_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.unique(['name', 'establishment_id']);
  });
}
