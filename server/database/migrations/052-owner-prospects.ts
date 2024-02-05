import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return Promise.all([
    knex.schema.createTable('owner_prospects', (table) => {
      table.string('email').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('address').notNullable();
      table.string('geo_code').notNullable();
      table.string('phone').notNullable();
      table.string('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    }),
  ]);
};

exports.down = function (knex: Knex) {
  return Promise.all([knex.schema.dropTable('owner_prospects')]);
};
