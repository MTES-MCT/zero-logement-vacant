import { Knex } from 'knex';

exports.up = function (knex: Knex) {
    return Promise.all([
        knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'),
        knex.schema
            .createTable('campaigns', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('name').notNullable();
                table.timestamp('createdAt').defaultTo(knex.fn.now());
            }),
        knex.schema
            .createTable('campaigns_housing', (table) => {
                table.uuid('campaignId').references('id').inTable('campaigns');
                table.string('housingRef');
            })
            .alterTable('campaign_housing', table => {
                table.primary(['campaignId', 'housingRef'])
            }),
    ]);
};

exports.down = function (knex: Knex) {
  return Promise.all([
      knex.schema.dropTable('campaign_housing'),
      knex.schema.dropTable('campaigns'),
      knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp";')
  ]);
};
