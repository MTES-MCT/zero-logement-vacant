import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.renameColumn('signatory_first_name', 'signatory_one_first_name');
    table.renameColumn('signatory_last_name', 'signatory_one_last_name');
    table.renameColumn('signatory_role', 'signatory_one_role');
    table.renameColumn('signatory_file', 'signatory_one_file');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.renameColumn('signatory_one_first_name', 'signatory_first_name');
    table.renameColumn('signatory_one_last_name', 'signatory_last_name');
    table.renameColumn('signatory_one_role', 'signatory_role');
    table.renameColumn('signatory_one_file', 'signatory_file');
  });
}
