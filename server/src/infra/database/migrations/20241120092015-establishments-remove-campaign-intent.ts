import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.dropColumns('campaign_intent', 'priority');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.string('campaign_intent').nullable();
    table.string('priority').nullable();
  });
}
