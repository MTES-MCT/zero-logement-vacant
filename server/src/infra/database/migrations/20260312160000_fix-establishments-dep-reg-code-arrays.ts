import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Drop short_name column (not used)
  // 2. Convert dep_code and reg_code from VARCHAR(3) to TEXT[] (PostgreSQL array)
  //    The data was truncated due to wrong column size
  await knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('short_name');
    table.dropColumn('dep_code');
    table.dropColumn('reg_code');
  });

  await knex.schema.alterTable('establishments', (table) => {
    table.specificType('dep_code', 'TEXT[]').nullable();
    table.specificType('reg_code', 'TEXT[]').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('dep_code');
    table.dropColumn('reg_code');
  });

  await knex.schema.alterTable('establishments', (table) => {
    table.string('short_name', 255).nullable();
    table.string('dep_code', 3).nullable();
    table.string('reg_code', 3).nullable();
  });
}
