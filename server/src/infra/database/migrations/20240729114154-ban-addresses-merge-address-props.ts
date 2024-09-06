import async from 'async';
import type { Knex } from 'knex';

const BATCH_SIZE = 10_000;

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
  let length = 0;
  let lastId: string | null = null;

  await async.doWhilst(
    async () => {
      const addresses: ReadonlyArray<{ ref_id: string }> = await knex(
        'ban_addresses'
      )
        .select('ref_id')
        .orderBy('ref_id')
        .modify((query) => {
          if (lastId) {
            query.where('ref_id', '>', lastId);
          }
        })
        .limit(BATCH_SIZE);

      if (!addresses.length) {
        length = 0;
        return;
      }

      const first = addresses[0].ref_id;
      const last = addresses[addresses.length - 1].ref_id;

      console.log(`Updating addresses...`, {
        size: addresses.length,
        from: first,
        to: last
      });
      await knex('ban_addresses')
        .update({
          address: knex.raw(
            `trim(regexp_replace(coalesce(house_number, '') || ' ' || coalesce(street, '') || ' ' || coalesce(postal_code, '') || ' ' || coalesce(city, ''), '\\s{2}', ' '))`
          )
        })
        .whereBetween('ref_id', [first, last]);

      // Update conditions
      length = addresses.length;
      lastId = last;
    },
    async () => length === BATCH_SIZE
  );

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
