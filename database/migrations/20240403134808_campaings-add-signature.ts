import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.text('signatory_last_name').notNullable();
    table.text('signatory_first_name').notNullable();
    table.text('signatory_role').notNullable();
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropColumn('signatory_last_name');
    table.dropColumn('signatory_first_name');
    table.dropColumn('signatory_role');
  });
}

