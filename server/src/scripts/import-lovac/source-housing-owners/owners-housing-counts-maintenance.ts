import db from '~/infra/database';
import { createLogger } from '~/infra/logger';

const logger = createLogger('ownersHousingCountsMaintenance');

/**
 * Recompute `owner_count` from scratch for each table whose count is
 * maintained by a trigger on `owners_housing`. Runs once over the whole
 * table — much cheaper than per-batch trigger fires during a bulk import.
 *
 * Each entry must mirror the maintenance contract of its corresponding
 * trigger.
 */
const RECOMPUTE_BY_TABLE = {
  campaigns: `
    UPDATE campaigns c
    SET owner_count = (
      SELECT COUNT(DISTINCT oh.owner_id)
      FROM campaigns_housing ch
      JOIN owners_housing oh
        ON oh.housing_id       = ch.housing_id
       AND oh.housing_geo_code = ch.housing_geo_code
       AND oh.rank = 1
      WHERE ch.campaign_id = c.id
    )
  `,
  groups: `
    UPDATE groups g
    SET owner_count = (
      SELECT COUNT(DISTINCT oh.owner_id)
      FROM groups_housing gh
      JOIN owners_housing oh
        ON oh.housing_id       = gh.housing_id
       AND oh.housing_geo_code = gh.housing_geo_code
       AND oh.rank = 1
      WHERE gh.group_id = g.id
    )
  `
} as const;

/**
 * Maps every user trigger on `owners_housing` to the maintained table it
 * recomputes. Used by `ensureKnownOwnersHousingTriggers` to fail loudly when
 * a new trigger is introduced without a matching recompute entry.
 */
const KNOWN_TRIGGERS: Record<string, keyof typeof RECOMPUTE_BY_TABLE> = {
  trg_update_campaign_owner_count_after_insert: 'campaigns',
  trg_update_campaign_owner_count_after_delete: 'campaigns',
  trg_update_campaign_owner_count_after_update: 'campaigns',
  trg_update_group_owner_count_after_insert: 'groups',
  trg_update_group_owner_count_after_delete: 'groups',
  trg_update_group_owner_count_after_update: 'groups'
};

interface PgTriggerRow {
  name: string;
}

export async function ensureKnownOwnersHousingTriggers(): Promise<void> {
  const { rows } = await db.raw<{ rows: PgTriggerRow[] }>(`
    SELECT t.tgname AS name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'owners_housing'
      AND NOT t.tgisinternal
  `);
  const found = rows.map((row) => row.name);
  const known = new Set(Object.keys(KNOWN_TRIGGERS));
  const unknown = found.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown user triggers on owners_housing: ${unknown.join(', ')}. ` +
        `Register them in KNOWN_TRIGGERS and add a recompute entry to ` +
        `RECOMPUTE_BY_TABLE in owners-housing-counts-maintenance.ts.`
    );
  }
}

export async function disableOwnersHousingTriggers(): Promise<void> {
  logger.info('Disabling user triggers on owners_housing');
  await db.raw('ALTER TABLE owners_housing DISABLE TRIGGER USER');
}

export async function enableOwnersHousingTriggers(): Promise<void> {
  logger.info('Enabling user triggers on owners_housing');
  await db.raw('ALTER TABLE owners_housing ENABLE TRIGGER USER');
}

export async function recomputeOwnersHousingCounts(): Promise<void> {
  for (const [table, sql] of Object.entries(RECOMPUTE_BY_TABLE)) {
    const start = Date.now();
    logger.info(`Recomputing owner_count for ${table}`);
    await db.raw(sql);
    logger.info(
      `Recomputed owner_count for ${table} in ${Date.now() - start}ms`
    );
  }
}
