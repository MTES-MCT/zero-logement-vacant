import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.text('signatory_file').nullable();
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropColumn('signatory_file');
  });
}

