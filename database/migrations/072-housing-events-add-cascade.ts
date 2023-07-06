import { Knex } from 'knex';
import {
  eventsTable,
  housingEventsTable,
} from '../../server/repositories/eventRepository';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable(housingEventsTable, (table) => {
    table.dropForeign('event_id');
    table
      .foreign('event_id')
      .references('id')
      .inTable(eventsTable)
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable(housingEventsTable, (table) => {
    table.dropForeign('event_id');
    table.foreign('event_id').references('id').inTable(eventsTable);
  });
};
