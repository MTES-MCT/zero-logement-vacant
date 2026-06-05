import type { Knex } from 'knex';

/**
 * Reverts `20260506160624_housing-owner-events-add-primary-key` and restores
 * the simpler `(event_id)` primary key set by
 * `20250716155117_housing-owner-events-fix-constraints`.
 *
 * The composite key was added on the assumption that `housing_owner_events`
 * had no PK and needed one to support idempotent ON CONFLICT inserts. In fact
 * a `(event_id)` PK was already in place — and matches the convention of
 * `housing_events`, which was deliberately simplified to a single-column PK
 * by `20250716150612`. Every event has at most one row in either link table
 * (1:1 with `events.id`), so `event_id` is naturally unique and a wider PK
 * adds nothing.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_owner_events', (table) => {
    table.dropPrimary();
    table.primary(['event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_owner_events', (table) => {
    table.dropPrimary();
    table.primary(['event_id', 'housing_id', 'housing_geo_code']);
  });
}
