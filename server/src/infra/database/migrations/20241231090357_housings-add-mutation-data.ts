import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.integer('plot_area').nullable();
    table.timestamp('last_mutation_date').nullable();
    table.timestamp('last_transaction_date').nullable();
    table.integer('last_transaction_value').nullable();
    table.string('occupancy_history').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('plot_area');
    table.dropColumn('last_mutation_date');
    table.dropColumn('last_transaction_date');
    table.dropColumn('last_transaction_value');
    table.dropColumn('occupancy_history');
  });
}
