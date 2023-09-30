import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.createTable('groups', (table) => {
    table.uuid('id').primary();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.integer('housing_count').notNullable();
    table.integer('owner_count').notNullable();
    table.timestamp('created_at').notNullable();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT')
      .comment('The creator id');
    table
      .uuid('establishment_id')
      .notNullable()
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });

  await knex.schema.createTable('groups_housing', (table) => {
    table
      .uuid('group_id')
      .notNullable()
      .references('id')
      .inTable('groups')
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
    table.primary(['group_id', 'housing_id', 'housing_geo_code']);
  });

  await knex.schema.alterTable('campaigns', (table) => {
    table
      .uuid('group_id')
      .references('id')
      .inTable('groups')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT')
      .comment('The group from which the campaign was created, if any');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('group_id');
  });

  await knex.schema.dropTable('groups_housing');
  await knex.schema.dropTable('groups');
};
