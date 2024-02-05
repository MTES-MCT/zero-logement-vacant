import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('housing_events', (table) => {
    table.index(['housing_id', 'event_id', 'housing_geo_code']);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropIndex(['housing_id', 'event_id', 'housing_geo_code']);
  });
};
