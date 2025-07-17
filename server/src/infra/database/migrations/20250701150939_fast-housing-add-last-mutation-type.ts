import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    ALTER TABLE fast_housing
    ADD COLUMN last_mutation_type VARCHAR(255) GENERATED ALWAYS AS (
      CASE
        WHEN last_mutation_date IS NOT NULL AND last_transaction_date IS NULL
          THEN null
        WHEN last_mutation_date IS NULL AND last_transaction_date IS NOT NULL
          THEN 'sale'
        WHEN last_mutation_date > last_transaction_date THEN 'donation'
        WHEN last_mutation_date <= last_transaction_date THEN 'sale'
        END
    ) STORED;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('last_mutation_type');
  });
}
