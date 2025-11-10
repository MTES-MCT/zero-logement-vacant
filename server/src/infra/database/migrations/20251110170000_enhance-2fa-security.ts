import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Add failed attempts counter
    table.integer('two_factor_failed_attempts').defaultTo(0).notNullable();

    // Add lockout timestamp
    table.timestamp('two_factor_locked_until', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('two_factor_failed_attempts');
    table.dropColumn('two_factor_locked_until');
  });
}
