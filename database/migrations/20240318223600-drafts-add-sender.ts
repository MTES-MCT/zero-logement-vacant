import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('senders', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.string('service').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('address').notNullable();
    table.string('email').nullable();
    table.string('phone').nullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at').notNullable();
    table
      .uuid('establishment_id')
      .notNullable()
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.unique(['name', 'establishment_id']);
  });
  await knex.schema.alterTable('drafts', (table) => {
    table
      .uuid('sender_id')
      .nullable()
      .references('id')
      .inTable('senders')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.dropColumn('sender_id');
  });
  await knex.schema.dropTable('senders');
}
