import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('ban_addresses', function(table) {
    table.index('ref_id', 'idx_ban_addresses_ref_id');
    table.index('ban_id', 'idx_ban_addresses_ban_id');
    table.index('address_kind', 'idx_address_kind');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('ban_addresses', function(table) {
    table.dropIndex('ref_id', 'idx_ban_addresses_ref_id');
    table.dropIndex('ban_id', 'idx_ban_addresses_ban_id');
    table.dropIndex('address_kind', 'idx_address_kind');
  });
}

