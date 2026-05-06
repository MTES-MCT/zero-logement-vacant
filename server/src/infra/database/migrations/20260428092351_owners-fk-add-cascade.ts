import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_notes', (table) => {
    table.dropForeign('owner_id');
    table
      .foreign('owner_id')
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });

  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropForeign('owner_id');
    table
      .foreign('owner_id')
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_notes', (table) => {
    table.dropForeign('owner_id');
    table.foreign('owner_id').references('id').inTable('owners');
  });

  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropForeign('owner_id');
    table.foreign('owner_id').references('id').inTable('owners');
  });
}
