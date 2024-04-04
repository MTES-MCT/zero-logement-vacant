import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableLike('owners_duplicates', 'owners', (table) => {
    table.uuid('source_id').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('owners_duplicates');
}
