import { Knex } from 'knex';

exports.up = function(knex: Knex) {
    return Promise.all([
        knex.schema
            .createTable('prospects', (table) => {
                table.string('email').primary();
                table.integer('establishment_siren');
                table.timestamp('last_account_request_at').notNullable();
                table.boolean('has_account').notNullable().defaultTo(false);
                table.boolean('has_commitment').notNullable().defaultTo(false);
            })
    ]);
};

exports.down = function(knex: Knex) {
  return Promise.all([
      knex.schema.dropTable('prospects')
  ]);
};
