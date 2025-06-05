import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table
      .string('type')
      .notNullable()
      // Set this default value until the production data is migrated
      .defaultTo('housing:created')
      .comment('The type of the event, for example "housing:created"');
    // TODO: provide a strategy to fill this field for existing events
    table.jsonb('next_old').nullable().comment('The value before this event');
    table.jsonb('next_new').nullable().comment('The value after this event');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumns('type', 'next_old', 'next_new');
  });
}
