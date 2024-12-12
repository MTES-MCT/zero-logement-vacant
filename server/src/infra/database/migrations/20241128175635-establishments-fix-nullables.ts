import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table
      .boolean('available')
      .notNullable()
      .alter({ alterNullable: true, alterType: false });
    table
      .string('kind')
      .notNullable()
      .alter({ alterNullable: true, alterType: false });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table
      .boolean('available')
      .nullable()
      .alter({ alterNullable: true, alterType: false });
    table
      .string('kind')
      .nullable()
      .alter({ alterNullable: true, alterType: false });
  });
}
