import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conflicts_housing_owners', (table) => {
    table
      .uuid('conflict_id')
      .notNullable()
      .references('id')
      .inTable('conflicts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.uuid('housing_id').notNullable();
    table.string('housing_geo_code').notNullable();
    table
      .foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('existing_owner_id')
      .nullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .comment('The existing owner, if any');
    table
      .uuid('replacement_owner_id')
      .nullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .comment('The replacement owner with which there is a conflict, if any');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('conflicts_housing_owners');
}
