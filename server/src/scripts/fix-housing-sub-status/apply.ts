import fs from 'node:fs';
import path from 'node:path';

import { chunksOf } from 'effect/Array';

import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import housingRepository from '~/repositories/housingRepository';

import { groupByTarget, type PlanRow } from './transforms';

const UPDATE_BATCH_SIZE = 1000;

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
  const groups = groupByTarget(rows);
  logger.info(
    `Applying ${rows.length} update(s) across ${groups.length} group(s)...`
  );

  await startTransaction(async () => {
    for (const group of groups) {
      logger.info('Updating group...', {
        status: group.status,
        subStatus: group.subStatus,
        housings: group.housings.length
      });
      for (const batch of chunksOf(group.housings, UPDATE_BATCH_SIZE)) {
        await housingRepository.updateMany(batch, {
          status: group.status,
          subStatus: group.subStatus
        });
      }
    }
  });

  logger.info('Done. Housing sub-status repair applied.');
}
