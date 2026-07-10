import fs from 'node:fs';
import path from 'node:path';

import {
  HOUSING_STATUS_LABELS,
  HousingStatus,
  Occupancy,
  OCCUPANCY_LABELS
} from '@zerologementvacant/models';
import { chunksOf } from 'effect/Array';
import { v5 as uuidv5 } from 'uuid';

import UserMissingError from '~/errors/userMissingError';
import {
  startTransaction,
  withinTransaction
} from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import type { HousingEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import userRepository from '~/repositories/userRepository';
import { LOVAC_NAMESPACE } from '~/scripts/import-lovac/infra';
import {
  disableHousingsTriggers,
  enableHousingsTriggers,
  ensureKnownHousingsTriggers,
  recomputeHousingsCounts
} from '~/scripts/import-lovac/infra/housings-counts-maintenance';

import type { PlanRow } from './transforms';

const ADMIN_EMAIL = 'admin@zerologementvacant.beta.gouv.fr';
const EVENTS_TABLE = 'events';
const HOUSING_EVENTS_TABLE = 'housing_events';
const TARGETS_TABLE = '_fix_housing_targets';
// The import year that should have exited these housings — keys the uuidv5 event
// ids so they match what the real lovac-2026 import would produce (idempotent).
const EXIT_YEAR = 'lovac-2026';
const BATCH_SIZE = 1000;

const logger = createLogger('fix-housing-sub-status:apply');

function readPlan(planPath: string): PlanRow[] {
  const content = fs.readFileSync(planPath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PlanRow);
}

export async function apply(options: { dryRun?: boolean } = {}): Promise<void> {
  const planPath = path.join(import.meta.dirname, 'plan.jsonl');
  const rows = readPlan(planPath);

  const admin = await userRepository.getByEmail(ADMIN_EMAIL);
  if (!admin) {
    throw new UserMissingError(ADMIN_EMAIL);
  }

  const now = new Date().toJSON();
  // Only the lovac-exit rows emit events, mirroring the import: a
  // status-updated + an occupancy-updated event, with deterministic uuidv5 ids.
  const events: HousingEventApi[] = rows
    .filter((row) => row.exit)
    .flatMap((row) => [
      {
        id: uuidv5(
          `${row.id}:housing:status-updated:${EXIT_YEAR}`,
          LOVAC_NAMESPACE
        ),
        type: 'housing:status-updated',
        nextOld: {
          status: HOUSING_STATUS_LABELS[row.current_status as HousingStatus],
          subStatus: row.current_sub_status
        },
        nextNew: {
          status: HOUSING_STATUS_LABELS[row.target_status as HousingStatus],
          subStatus: row.target_sub_status
        },
        createdAt: now,
        createdBy: admin.id,
        housingGeoCode: row.geo_code,
        housingId: row.id
      },
      {
        id: uuidv5(
          `${row.id}:housing:occupancy-updated:${EXIT_YEAR}`,
          LOVAC_NAMESPACE
        ),
        type: 'housing:occupancy-updated',
        nextOld: {
          occupancy: OCCUPANCY_LABELS[row.current_occupancy as Occupancy]
        },
        nextNew: { occupancy: OCCUPANCY_LABELS[Occupancy.UNKNOWN] },
        createdAt: now,
        createdBy: admin.id,
        housingGeoCode: row.geo_code,
        housingId: row.id
      }
    ]);

  const deleteEventIds = rows
    .map((row) => row.delete_event_id)
    .filter((eventId): eventId is string => eventId !== null);

  logger.info(
    `${options.dryRun ? '[dry-run] Would apply' : 'Applying'} ${rows.length} ` +
      `update(s); writing ${events.length} event(s); ` +
      `deleting ${deleteEventIds.length} event(s)...`
  );

  if (options.dryRun) {
    logger.info('Dry run — no changes written.');
    return;
  }

  // fast_housing carries per-row count triggers (return_count, building stats)
  // that make a bulk update take hours. Bypass them for the write and recompute
  // once at the end — mirroring the LOVAC import.
  await ensureKnownHousingsTriggers();
  await disableHousingsTriggers();
  try {
    await startTransaction(async () => {
      await withinTransaction(async (transaction) => {
        // fast_housing is RANGE-partitioned by geo_code. A row-value
        // `(geo_code, id) IN (...)` doesn't prune, so each statement scans many
        // partitions (minutes). Instead, load the targets into a temp table and
        // drive a nested-loop index join: forcing off hash/merge joins makes the
        // planner reach fast_housing by its `(geo_code, id)` PK with runtime
        // partition pruning — one target, one partition, one index lookup.
        await transaction.raw('SET LOCAL enable_hashjoin = off');
        await transaction.raw('SET LOCAL enable_mergejoin = off');
        await transaction.raw(`
          CREATE TEMP TABLE ${TARGETS_TABLE} (
            geo_code text NOT NULL,
            id uuid NOT NULL,
            status integer NOT NULL,
            sub_status text,
            occupancy text
          ) ON COMMIT DROP
        `);

        let loaded = 0;
        for (const batch of chunksOf(rows, BATCH_SIZE)) {
          await transaction(TARGETS_TABLE).insert(
            batch.map((row) => ({
              geo_code: row.geo_code,
              id: row.id,
              status: row.target_status,
              sub_status: row.target_sub_status,
              occupancy: row.target_occupancy
            }))
          );
          loaded += batch.length;
          logger.info(
            `Loaded ${loaded}/${rows.length} targets into temp table`
          );
        }

        // A null target_occupancy means "leave occupancy unchanged" (only the
        // lovac-exit rows carry 'inconnu'); COALESCE preserves the existing value.
        await transaction.raw(`
          UPDATE fast_housing AS h
          SET status = t.status,
              sub_status = t.sub_status,
              occupancy = COALESCE(t.occupancy, h.occupancy)
          FROM ${TARGETS_TABLE} AS t
          WHERE h.geo_code = t.geo_code AND h.id = t.id
        `);
        logger.info(`Updated ${rows.length} housings`);
      });

      let written = 0;
      for (const batch of chunksOf(events, BATCH_SIZE)) {
        await eventRepository.insertManyHousingEvents(batch);
        written += batch.length;
        logger.info(`Wrote ${written}/${events.length} events`);
      }

      for (const batch of chunksOf(deleteEventIds, BATCH_SIZE)) {
        await withinTransaction(async (transaction) => {
          await transaction(HOUSING_EVENTS_TABLE)
            .whereIn('event_id', batch)
            .delete();
          await transaction(EVENTS_TABLE).whereIn('id', batch).delete();
        });
      }
      if (deleteEventIds.length) {
        logger.info(`Deleted ${deleteEventIds.length} events`);
      }
    });
  } finally {
    await enableHousingsTriggers();
  }

  logger.info(
    'Recomputing derived counts (buildings, campaigns return_count)...'
  );
  await recomputeHousingsCounts();

  logger.info('Done. Housing repair applied.');
}
