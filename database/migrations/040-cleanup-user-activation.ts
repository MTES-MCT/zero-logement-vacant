import { Knex } from 'knex';

exports.up = function(knex: Knex) {
    return Promise.all([
        knex.schema.dropTable('auth_tokens')
    ]);
};

exports.down = function(knex: Knex) {
  return Promise.all([
      knex.schema
          .createTable('auth_tokens', (table) => {
              table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
              table.uuid('user_id').references('id').inTable('users').notNullable().unique();
              table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
          }),
  ]);
};
