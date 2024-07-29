import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ban_addresses', (table) => {
    table.string('address').nullable().comment('The full street address');
    // Deprecate other fields
    table
      .string('house_number')
      .nullable()
      .comment('Deprecated in favor of address')
      .alter();
    table
      .string('street')
      .nullable()
      .comment('Deprecated in favor of address')
      .alter();
    table
      .string('postal_code')
      .nullable()
      .comment('Deprecated in favor of address')
      .alter();
    table
      .string('city')
      .nullable()
      .comment('Deprecated in favor of address')
      .alter();
  });

  // Copy to the new address column
  await knex('ban_addresses').update({
    address: knex.raw(
      `trim(regexp_replace(coalesce(house_number, '') || ' ' || coalesce(street, '') || ', ' || coalesce(postal_code, '') || ' ' || coalesce(city, ''), '\\s{2}', ' '))`
    )
  });

  await knex.schema.alterTable('ban_addresses', (table) => {
    table.dropNullable('address');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ban_addresses', (table) => {
    table.dropColumn('address');
    // Remove deprecation
    table.string('house_number').nullable().alter();
    table.string('street').nullable().alter();
    table.string('postal_code').nullable().alter();
    table.string('city').nullable().alter();
  });
}
