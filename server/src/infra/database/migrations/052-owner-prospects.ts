import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('owner_prospects', (table) => {
      table.string('email').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('address').notNullable();
      table.string('geo_code').notNullable();
      table.string('phone').notNullable();
      table.string('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([knex.schema.dropTable('owner_prospects')]);
}
