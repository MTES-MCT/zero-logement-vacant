import { Knex } from 'knex';
import { eventsTable } from '../../server/repositories/eventRepository';

const statuses = [
  'Jamais contacté',
  'En attente de retour',
  'Premier contact',
  'Suivi en cours',
  'Non-vacant',
  'Bloqué',
  'Sortie de la vacance',
];

exports.up = async function (knex: Knex) {
  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(
        `
          UPDATE ${eventsTable}
          SET old = jsonb_set(old, '{status}', '"${status}"')
          WHERE old @> '{ "status": ${i} }'
        `
      );
    })
  );

  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(`
        UPDATE ${eventsTable}
        SET new = jsonb_set(new, '{status}', '"${status}"', false)
        WHERE new @> '{ "status": ${i} }'::jsonb
      `);
    })
  );
};

exports.down = async function (knex: Knex) {
  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(`
        UPDATE ${eventsTable}
        SET old = jsonb_set(old, '{status}', '${i}', false)
        WHERE old @> '{ "status": "${status}" }'::jsonb
      `);
    })
  );

  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(`
        UPDATE ${eventsTable}
        SET new = jsonb_set(new, '{status}', '${i}', false)
        WHERE new @> '{ "status": "${status}" }'::jsonb
      `);
    })
  );
};
