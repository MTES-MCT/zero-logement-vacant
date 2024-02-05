import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return Promise.all([
    knex.schema.createTable('signup_links', (table) => {
      table.string('id').primary();
      table.string('prospect_email').notNullable();
      table.timestamp('expires_at').notNullable();
    }),
  ]);
};

exports.down = async function (knex: Knex) {
  await knex.table('users').delete().whereNull('activated_at');
  return Promise.all([knex.schema.dropTable('signup_links')]);
};
