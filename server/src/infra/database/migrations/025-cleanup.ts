import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners', (table) => {
      table.dropColumn('beneficiary_count');
      table.dropColumn('local_ids');
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners', (table) => {
      table.integer('beneficiary_count');
      table.specificType('local_ids', 'text[]');
    })
  ]);
}
