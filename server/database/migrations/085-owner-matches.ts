import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.createTable('owner_matches', (table) => {
    table
      .uuid('owner_id')
      .references('id')
      .inTable('owners')
      .notNullable()
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('idpersonne').notNullable();
    table.primary(['owner_id', 'idpersonne']);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('owner_matches');
};
