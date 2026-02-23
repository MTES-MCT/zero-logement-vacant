import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add establishment_id column as nullable (expand phase)
  await knex.schema.alterTable('documents', (table) => {
    table.uuid('establishment_id').nullable();
    table
      .foreign('establishment_id')
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
  });

  // Backfill establishment_id from created_by user's establishment
  await knex.raw(`
    UPDATE documents
    SET establishment_id = users.establishment_id
    FROM users
    WHERE documents.created_by = users.id
    AND documents.establishment_id IS NULL
  `);

  await knex.schema.alterTable('documents', (table) => {
    table.dropNullable('establishment_id');
  });

  // Add index for queries
  await knex.schema.alterTable('documents', (table) => {
    table.index('establishment_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('documents', (table) => {
    table.dropForeign(['establishment_id']);
    table.dropIndex(['establishment_id']);
    table.dropColumn('establishment_id');
  });
}
