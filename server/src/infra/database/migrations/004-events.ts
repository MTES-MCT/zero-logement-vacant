import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('events', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('owner_id');
      table.string('housing_id');
      table.string('kind').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('content');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([knex.schema.dropTable('events')]);
}
