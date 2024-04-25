import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.string('subject');
  });

  await knex('drafts').update({ subject: '' });

  await knex.schema.alterTable('drafts', (table) => {
    table.string('subject').notNullable().alter({ alterNullable: true });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.dropColumn('subject');
  });
}
