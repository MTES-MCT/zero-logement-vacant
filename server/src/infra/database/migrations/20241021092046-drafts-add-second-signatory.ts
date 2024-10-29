import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.text('signatory_two_first_name').nullable();
    table.text('signatory_two_last_name').nullable();
    table.text('signatory_two_role').nullable();
    table.text('signatory_two_file').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropColumns(
      'signatory_two_first_name',
      'signatory_two_last_name',
      'signatory_two_role',
      'signatory_two_file'
    );
  });
}
