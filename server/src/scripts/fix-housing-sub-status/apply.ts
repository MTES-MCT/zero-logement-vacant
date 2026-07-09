import fs from 'node:fs';
import path from 'node:path';

import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { chunksOf } from 'effect/Array';
import { v4 as uuidv4 } from 'uuid';

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

import { groupByTarget, type PlanRow } from './transforms';

const ADMIN_EMAIL = 'admin@zerologementvacant.beta.gouv.fr';
const EVENTS_TABLE = 'events';
const HOUSING_EVENTS_TABLE = 'housing_events';
const BATCH_SIZE = 1000;

const logger = createLogger('fix-housing-sub-status:apply');

function readPlan(planPath: string): PlanRow[] {
  const content = fs.readFileSync(planPath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PlanRow);
}

export async function apply(): Promise<void> {
  const planPath = path.join(import.meta.dirname, 'plan.jsonl');
  const rows = readPlan(planPath);

  const admin = await userRepository.getByEmail(ADMIN_EMAIL);
  if (!admin) {
    throw new UserMissingError(ADMIN_EMAIL);
  }

  const now = new Date().toJSON();
  const events: HousingEventApi[] = rows
    .filter((row) => row.write_event)
    .map((row) => ({
      id: uuidv4(),
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
    }));

  const deleteEventIds = rows
    .map((row) => row.delete_event_id)
    .filter((eventId): eventId is string => eventId !== null);

  const groups = groupByTarget(rows);
  logger.info(
    `Applying ${rows.length} update(s) across ${groups.length} group(s); ` +
      `writing ${events.length} event(s); deleting ${deleteEventIds.length} event(s)...`
  );

  await startTransaction(async () => {
    for (const group of groups) {
      for (const batch of chunksOf(group.housings, BATCH_SIZE)) {
        await housingRepository.updateMany(batch, {
          status: group.status,
          subStatus: group.subStatus
        });
      }
    }
    for (const batch of chunksOf(events, BATCH_SIZE)) {
      await eventRepository.insertManyHousingEvents(batch);
    }
    for (const batch of chunksOf(deleteEventIds, BATCH_SIZE)) {
      await withinTransaction(async (transaction) => {
        await transaction(HOUSING_EVENTS_TABLE)
          .whereIn('event_id', batch)
          .delete();
        await transaction(EVENTS_TABLE).whereIn('id', batch).delete();
      });
    }
  });

  logger.info('Done. Housing repair applied.');
}
