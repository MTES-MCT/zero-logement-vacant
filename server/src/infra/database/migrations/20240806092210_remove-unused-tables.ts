import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('old_housing');
  await knex.schema.dropTableIfExists('old_events');
  await knex.schema.dropTableIfExists('housing');
}


export async function down(): Promise<void> {
}
