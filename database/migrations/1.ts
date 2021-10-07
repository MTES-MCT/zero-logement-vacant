import { Knex } from 'knex';

exports.up = function (knex: Knex) {
    return Promise.all([
        knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'),
        knex.schema
            .createTable('campaigns', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('name').notNullable();
                table.string('toto').notNullable();
                table.timestamp('createdAt').defaultTo(knex.fn.now());
            })
    ]);
};

exports.down = function (knex: Knex) {
  return Promise.all([
      knex.schema.dropTable('campaigns'),
      knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp";')
  ]);
};
