import db from '~/infra/database';
import { createLogger } from '~/infra/logger';

const logger = createLogger('sourceHousingsCountsMaintenance');

/**
 * Tables that the housings import writes to and that carry user triggers
 * which the import wants to bypass for performance and to avoid deadlocks
 * on parallel department writers. All user triggers on these tables are
 * disabled for the duration of the import and re-enabled in `finally`.
 */
const MANAGED_TABLES = ['fast_housing', 'housing_events'] as const;

/**
 * Recompute SQL for each derived count maintained by the bypassed triggers.
 * Runs once after the import completes — far cheaper than the
 * per-row/per-statement trigger fires we skipped.
 */
const RECOMPUTES = {
  buildings_counts: `
    UPDATE buildings b
    SET
      rent_housing_count = COALESCE((
        SELECT COUNT(*)
        FROM fast_housing
        WHERE building_id = b.id
          AND occupancy = 'L'
      ), 0),
      vacant_housing_count = COALESCE((
        SELECT COUNT(*)
        FROM fast_housing
        WHERE building_id = b.id
          AND occupancy = 'V'
      ), 0)
  `,
  campaigns_return_count: `
    UPDATE campaigns c
    SET return_count = (
      SELECT COUNT(DISTINCT ch.housing_id)
      FROM campaigns_housing ch
      JOIN fast_housing h
        ON h.id = ch.housing_id
       AND h.geo_code = ch.housing_geo_code
      WHERE ch.campaign_id = c.id
        AND h.status BETWEEN 2 AND 5
        AND EXISTS (
          SELECT 1
          FROM housing_events he
          JOIN events e ON e.id = he.event_id
          WHERE he.housing_geo_code = ch.housing_geo_code
            AND he.housing_id       = ch.housing_id
            AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
            AND e.created_at        > c.sent_at
        )
    )
    WHERE c.sent_at IS NOT NULL
  `
} as const;

/**
 * Maps every user trigger on the managed tables to the recompute that
 * compensates for skipping it. Keys are trigger names; values are the
 * recompute identifier in `RECOMPUTES`.
 *
 * If a new trigger is added to one of the managed tables, the startup check
 * fails loudly until this map is updated and a corresponding recompute is
 * added.
 */
const KNOWN_TRIGGERS: Record<string, keyof typeof RECOMPUTES> = {
  // fast_housing: buildings counts
  housing_insert_building_trigger: 'buildings_counts',
  housing_update_building_trigger: 'buildings_counts',
  housing_delete_building_trigger: 'buildings_counts',
  // fast_housing: campaigns.return_count via status-change recompute
  trg_recompute_return_count_on_housing_status_change: 'campaigns_return_count',
  // housing_events: campaigns.return_count incremental maintenance
  trg_increment_return_count: 'campaigns_return_count'
};

interface PgTriggerRow {
  name: string;
  table: string;
}

export async function ensureKnownSourceHousingsTriggers(): Promise<void> {
  const placeholders = MANAGED_TABLES.map(() => '?').join(', ');
  const { rows } = await db.raw<{ rows: PgTriggerRow[] }>(
    `
    SELECT t.tgname    AS name,
           c.relname   AS table
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname IN (${placeholders})
      AND NOT t.tgisinternal
  `,
    [...MANAGED_TABLES]
  );

  const known = new Set(Object.keys(KNOWN_TRIGGERS));
  const unknown = rows.filter((row) => !known.has(row.name));
  if (unknown.length > 0) {
    const list = unknown.map((row) => `${row.table}.${row.name}`).join(', ');
    throw new Error(
      `Unknown user triggers on managed tables: ${list}. ` +
        `Register them in KNOWN_TRIGGERS and add a recompute entry to ` +
        `RECOMPUTES in source-housings-counts-maintenance.ts.`
    );
  }
}

export async function disableSourceHousingsTriggers(): Promise<void> {
  for (const table of MANAGED_TABLES) {
    logger.info(`Disabling user triggers on ${table}`);
    await db.raw(`ALTER TABLE ?? DISABLE TRIGGER USER`, [table]);
  }
}

export async function enableSourceHousingsTriggers(): Promise<void> {
  for (const table of MANAGED_TABLES) {
    logger.info(`Enabling user triggers on ${table}`);
    await db.raw(`ALTER TABLE ?? ENABLE TRIGGER USER`, [table]);
  }
}

export async function recomputeSourceHousingsCounts(): Promise<void> {
  for (const [name, sql] of Object.entries(RECOMPUTES)) {
    const start = Date.now();
    logger.info(`Recomputing ${name}`);
    await db.raw(sql);
    logger.info(`Recomputed ${name} in ${Date.now() - start}ms`);
  }
}
