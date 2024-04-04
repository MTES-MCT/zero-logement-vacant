import { Knex } from 'knex';

const eventsTable = 'events';
const statuses = [
  'Jamais contacté',
  'En attente de retour',
  'Premier contact',
  'Suivi en cours',
  'Non-vacant',
  'Bloqué',
  'Sortie de la vacance',
];

export async function up(knex: Knex): Promise<void> {
  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(
        `
          UPDATE ${eventsTable}
          SET old = jsonb_set(old, '{status}', '"${status}"')
          WHERE old @> '{ "status": ${i} }'
        `,
      );
    }),
  );

  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(`
        UPDATE ${eventsTable}
        SET new = jsonb_set(new, '{status}', '"${status}"', false)
        WHERE new @> '{ "status": ${i} }'::jsonb
      `);
    }),
  );
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(`
        UPDATE ${eventsTable}
        SET old = jsonb_set(old, '{status}', '${i}', false)
        WHERE old @> '{ "status": "${status}" }'::jsonb
      `);
    }),
  );

  await Promise.all(
    statuses.map(async (status, i) => {
      await knex.raw(`
        UPDATE ${eventsTable}
        SET new = jsonb_set(new, '{status}', '${i}', false)
        WHERE new @> '{ "status": "${status}" }'::jsonb
      `);
    }),
  );
}
