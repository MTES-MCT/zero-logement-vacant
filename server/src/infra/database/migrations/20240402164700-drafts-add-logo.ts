import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.specificType('logo', 'text[]');
  });
  await knex('drafts').update({ logo: [], });
  await knex.schema.alterTable('drafts', (table) => {
    table
      .specificType('logo', 'text[]')
      .notNullable()
      .alter({ alterNullable: true, });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.dropColumn('logo');
  });
}
