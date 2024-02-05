import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('housing_events', (table) => {
    table.primary(['housing_id', 'event_id']);
  });
  await knex.schema.alterTable('owner_events', (table) => {
    table.primary(['owner_id', 'event_id']);
  });
  await knex.schema.alterTable('campaign_events', (table) => {
    table.primary(['campaign_id', 'event_id']);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropPrimary();
  });
  await knex.schema.alterTable('owner_events', (table) => {
    table.dropPrimary();
  });
  await knex.schema.alterTable('campaign_events', (table) => {
    table.dropPrimary();
  });
};
