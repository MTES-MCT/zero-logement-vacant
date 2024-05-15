import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([knex.raw('CREATE EXTENSION IF NOT EXISTS "unaccent";')]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([knex.raw('DROP EXTENSION IF EXISTS "unaccent";')]);
}
