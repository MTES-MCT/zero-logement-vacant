import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.integer('kind').defaultTo(0);
    }),
    knex.raw('update campaigns set kind = 1 where reminder_number > 0')
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.dropColumn('kind');
    })
  ]);
}
