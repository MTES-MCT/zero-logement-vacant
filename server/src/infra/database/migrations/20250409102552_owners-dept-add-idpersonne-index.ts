import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_dept', (table) => {
    table.unique(['owner_idpersonne']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_dept', (table) => {
    table.dropUnique(['owner_idpersonne']);
  });
}
