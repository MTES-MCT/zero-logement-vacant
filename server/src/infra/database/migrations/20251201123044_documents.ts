import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary();
    table.string('filename').notNullable();
    table.string('s3_key').notNullable().unique();
    table.string('content_type').notNullable();
    table.integer('size_bytes').notNullable();
    table.uuid('created_by').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
    table.timestamp('deleted_at').nullable();

    table
      .foreign('created_by')
      .references('id')
      .inTable('users')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
    table.index('s3_key');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('documents');
}
