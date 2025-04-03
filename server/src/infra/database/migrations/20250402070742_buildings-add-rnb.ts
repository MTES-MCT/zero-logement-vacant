import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.string('rnb_id').nullable();
    table.integer('rnb_id_score').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.dropColumn('rnb_id');
    table.dropColumn('rnb_id_score');
  });
}
