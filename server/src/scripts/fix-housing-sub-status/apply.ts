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
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';
import { LOVAC_NAMESPACE } from '~/scripts/import-lovac/infra';
import {
  disableHousingsTriggers,
  enableHousingsTriggers,
  ensureKnownHousingsTriggers,
  recomputeHousingsCounts
} from '~/scripts/import-lovac/infra/housings-counts-maintenance';

import { groupByTarget, type PlanRow } from './transforms';

const ADMIN_EMAIL = 'admin@zerologementvacant.beta.gouv.fr';
const EVENTS_TABLE = 'events';
const HOUSING_EVENTS_TABLE = 'housing_events';
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

  const groups = groupByTarget(rows);
  logger.info(
    `${options.dryRun ? '[dry-run] Would apply' : 'Applying'} ${rows.length} ` +
      `update(s) across ${groups.length} group(s); ` +
      `writing ${events.length} event(s); deleting ${deleteEventIds.length} event(s)...`
  );

  if (options.dryRun) {
    logger.info('Dry run — no changes written.');
    return;
  }

  // fast_housing carries per-row count triggers (return_count, building stats)
  // that make a 17k-row bulk update take hours. Bypass them for the write and
  // recompute once at the end — mirroring the LOVAC import.
  await ensureKnownHousingsTriggers();
  await disableHousingsTriggers();
  try {
    await startTransaction(async () => {
      let updated = 0;
      for (const [index, group] of groups.entries()) {
        for (const batch of chunksOf(group.housings, BATCH_SIZE)) {
          await housingRepository.updateMany(batch, {
            status: group.status,
            subStatus: group.subStatus,
            ...(group.occupancy !== null && {
              occupancy: group.occupancy as Occupancy
            })
          });
          updated += batch.length;
        }
        logger.info(
          `Updated group ${index + 1}/${groups.length} · ${updated}/${rows.length} housings`
        );
      }

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
