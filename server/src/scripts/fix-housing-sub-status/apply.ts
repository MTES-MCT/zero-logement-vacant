import fs from 'node:fs';
import path from 'node:path';

import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { chunksOf } from 'effect/Array';
import { v4 as uuidv4 } from 'uuid';

import UserMissingError from '~/errors/userMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import type { HousingEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

import { groupByTarget, needsEvent, type PlanRow } from './transforms';

const ADMIN_EMAIL = 'admin@zerologementvacant.beta.gouv.fr';
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
  const events: HousingEventApi[] = rows.filter(needsEvent).map((row) => ({
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

  const groups = groupByTarget(rows);
  logger.info(
    `Applying ${rows.length} update(s) across ${groups.length} group(s); writing ${events.length} event(s)...`
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
  });

  logger.info('Done. Housing repair applied.');
}
