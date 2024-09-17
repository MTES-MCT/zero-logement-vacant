import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.text('description');
  });

  await knex.raw(`
    UPDATE campaigns
    SET 
      title = CONCAT(SUBSTRING(title, 1, LENGTH(SUBSTRING(title, 1, 61)) - POSITION(' ' IN REVERSE(SUBSTRING(title, 1, 61))) + 1), '...'),
      description = CONCAT('...', SUBSTRING(title, LENGTH(SUBSTRING(title, 1, 61)) - POSITION(' ' IN REVERSE(SUBSTRING(title, 1, 61))) + 2))
    WHERE LENGTH(title) > 64;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('description');
  });
}
