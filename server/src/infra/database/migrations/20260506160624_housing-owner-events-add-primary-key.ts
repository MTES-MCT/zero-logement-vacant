import type { Knex } from 'knex';

/**
 * Adds the missing composite primary key to `housing_owner_events`. The table
 * was created without one, leaving it without a natural conflict target for
 * idempotent bulk inserts (LOVAC re-runs).
 *
 * Mirrors the convention used by sibling event-link tables
 * (`housing_events`, `campaign_housing_events`):
 * `(event_id, *_id, *_geo_code)`.
 *
 * `owner_id` is intentionally excluded — it is nullable and not part of the
 * link's identity (a single event maps to one (housing, owner) pair, but PK
 * columns must be NOT NULL).
 *
 * The redundant standalone index on `event_id` is dropped: the new PK's
 * leading column already supports any `event_id`-prefix lookup.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_owner_events', (table) => {
    table.dropIndex('event_id');
    table.primary(['event_id', 'housing_id', 'housing_geo_code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_owner_events', (table) => {
    table.dropPrimary();
    table.index('event_id');
  });
}
