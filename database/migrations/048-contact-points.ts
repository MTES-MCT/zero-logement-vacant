import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('contact_points', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('establishment_id')
      .references('id')
      .inTable('establishments')
      .notNullable();
    table.string('title').notNullable();
    table.string('opening');
    table.string('address');
    table.string('email');
    table.string('phone');
    table.string('notes');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTable('contact_points');
};
