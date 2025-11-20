import type { Knex } from 'knex';

const TABLE = 'owner_prospects';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE, (table) => {
    table.string('email').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('address').notNullable();
    table.string('geo_code').notNullable();
    table.string('phone').notNullable();
    table.string('notes').nullable();
    table.timestamp('created_at').nullable().defaultTo(knex.fn.now());
    table.string('invariant').nullable();
    table.uuid('id').primary().notNullable();
    table.boolean('call_back').notNullable().defaultTo(false);
    table.boolean('read').notNullable().defaultTo(false);
  });
}
