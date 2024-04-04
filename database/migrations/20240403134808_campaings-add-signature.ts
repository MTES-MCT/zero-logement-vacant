import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.text('signatory_last_name').nullable();
    table.text('signatory_first_name').nullable();
    table.text('signatory_role').nullable();
    table.text('signatory_file').nullable();
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropColumn('signatory_last_name');
    table.dropColumn('signatory_first_name');
    table.dropColumn('signatory_role');
    table.dropColumn('signatory_file');
  });
}

