import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('owners', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('full_name').notNullable();
      table.date('birth_date');
      table.string('administrator');
      table.specificType('raw_address', 'text[]').notNullable();
      table.string('owner_kind').notNullable();
      table.string('owner_kind_detail').notNullable();
      table.integer('beneficiary_count');
      table.string('email');
      table.string('phone');
      table.specificType('local_ids', 'text[]').notNullable();
    }),
    knex.schema
      .createTable('owners_housing', (table) => {
        table.uuid('owner_id').references('id').inTable('owners');
        table.uuid('housing_id').references('id').inTable('housing');
      })
      .alterTable('owners_housing', (table) => {
        table.primary(['owner_id', 'housing_id']);
      })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.dropTable('owners_housing'),
    knex.schema.dropTable('owners')
  ]);
}
