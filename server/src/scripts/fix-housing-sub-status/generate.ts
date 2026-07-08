import fs from 'node:fs';
import path from 'node:path';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';

import { decide } from './decide';
import { toDecideInput, type RawRow } from './transforms';

const logger = createLogger('fix-housing-sub-status:generate');

const QUERY = `
  SELECT h.geo_code, h.id, h.status, h.data_file_years,
         le.next_new, le.created_at AS event_created_at
  FROM fast_housing h
  LEFT JOIN LATERAL (
    SELECT e.next_new, e.created_at
    FROM housing_events he
    JOIN events e ON e.id = he.event_id AND e.type = 'housing:status-updated'
    WHERE he.housing_geo_code = h.geo_code AND he.housing_id = h.id
    ORDER BY e.created_at DESC
    LIMIT 1
  ) le ON true
  WHERE h.status IN (2, 3, 4, 5) AND h.sub_status IS NULL
`;

export async function generate(): Promise<void> {
  const planPath = path.join(import.meta.dirname, 'plan.jsonl');
  const errorsPath = path.join(import.meta.dirname, 'errors.jsonl');

  logger.info('Querying bad housings and their latest status event...');
  const result = await db.raw<{ rows: RawRow[] }>(QUERY);
  const rows = result.rows;
  logger.info(
    `Found ${rows.length} housing(s) with a required-but-missing sub-status.`
  );

  const planLines: string[] = [];
  const errorLines: string[] = [];
  const bySource: Record<string, number> = {};

  for (const row of rows) {
    const decision = decide(toDecideInput(row));
    if (decision.action === 'update') {
      bySource[decision.source] = (bySource[decision.source] ?? 0) + 1;
      planLines.push(
        JSON.stringify({
          geo_code: decision.geoCode,
          id: decision.id,
          current_status: decision.currentStatus,
          target_status: decision.targetStatus,
          target_sub_status: decision.targetSubStatus,
          source: decision.source,
          event_created_at:
            decision.source === 'event' && row.event_created_at
              ? new Date(row.event_created_at).toISOString()
              : null
        })
      );
    } else {
      errorLines.push(
        JSON.stringify({
          geo_code: decision.geoCode,
          id: decision.id,
          current_status: decision.currentStatus,
          reason: decision.reason,
          next_new: decision.nextNew
        })
      );
    }
  }

  fs.writeFileSync(
    planPath,
    planLines.length ? planLines.join('\n') + '\n' : ''
  );
  fs.writeFileSync(
    errorsPath,
    errorLines.length ? errorLines.join('\n') + '\n' : ''
  );

  logger.info('Wrote plan.', {
    path: planPath,
    updates: planLines.length,
    bySource
  });
  logger.info('Wrote errors (to review).', {
    path: errorsPath,
    errors: errorLines.length
  });
}
