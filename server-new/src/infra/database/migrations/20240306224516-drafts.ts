import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('drafts', (table) => {
    table.uuid('id').primary();
    table.text('body').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at').notNullable();
    table
      .uuid('establishment_id')
      .notNullable()
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .comment('The establishment to which the draft belongs');
  });

  await knex.schema.createTable('campaigns_drafts', (table) => {
    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('draft_id')
      .notNullable()
      .references('id')
      .inTable('drafts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.primary(['campaign_id', 'draft_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('campaigns_drafts');
  await knex.schema.dropTable('drafts');
}
