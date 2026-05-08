import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.boolean('is_multi_owner').nullable();
  });

  await knex.raw(`
    UPDATE owners
    SET is_multi_owner = (
      SELECT COUNT(*) > 1
      FROM owners_housing
      WHERE owner_id = owners.id
        AND rank = 1
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumn('is_multi_owner');
  });
}
