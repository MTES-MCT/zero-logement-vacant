import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('housing').where({ status: 6, }).update({ status: 4, });
}

export async function down(): Promise<void> {
  // There's no going back
}
