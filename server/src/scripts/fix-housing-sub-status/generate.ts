import fs from 'node:fs';
import path from 'node:path';

import { getSubStatuses, HousingStatus } from '@zerologementvacant/models';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';

import { decide } from './decide';
import { selectedBy, toDecideInput, type RawRow } from './transforms';

const logger = createLogger('fix-housing-sub-status:generate');

// Coherent (status, sub_status) pairs, from the app's own validation sets — the
// single source of truth for what counts as an incoherent pair.
const COHERENT_PAIRS: ReadonlyArray<[number, string]> = [
  HousingStatus.FIRST_CONTACT,
  HousingStatus.IN_PROGRESS,
  HousingStatus.COMPLETED,
  HousingStatus.BLOCKED
].flatMap((status) =>
  [...getSubStatuses(status)].map((sub): [number, string] => [status, sub])
);

// A housing needs repair when its (status, sub_status) pair is invalid:
//   - a status that requires a sub-status (2/3/4/5) has none, or one not in its set;
//   - a status that forbids a sub-status (0/1) carries one.
function buildQuery(): { sql: string; bindings: Array<number | string> } {
  const pairs = COHERENT_PAIRS.map(() => '(?, ?)').join(', ');
  const bindings = COHERENT_PAIRS.flat();
  const sql = `
    SELECT h.geo_code, h.id, h.status, h.sub_status, h.data_file_years,
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
    WHERE
      (
        h.status IN (2, 3, 4, 5)
        AND (h.sub_status IS NULL OR (h.status, h.sub_status) NOT IN (${pairs}))
      )
      OR (h.status IN (0, 1) AND h.sub_status IS NOT NULL)
  `;
  return { sql, bindings };
}

export async function generate(): Promise<void> {
  const planPath = path.join(import.meta.dirname, 'plan.jsonl');
  const errorsPath = path.join(import.meta.dirname, 'errors.jsonl');

  logger.info('Querying housings with an invalid (status, sub-status)...');
  const { sql, bindings } = buildQuery();
  const result = await db.raw<{ rows: RawRow[] }>(sql, bindings);
  const rows = result.rows;
  logger.info(`Found ${rows.length} housing(s) to repair.`);

  const planLines: string[] = [];
  const errorLines: string[] = [];
  const bySource: Record<string, number> = {};
  const bySelectedBy: Record<string, number> = {};
  const byCohort: Record<string, number> = {};

  for (const row of rows) {
    const selected = selectedBy(row.status, row.sub_status);
    bySelectedBy[selected] = (bySelectedBy[selected] ?? 0) + 1;

    const decision = decide(toDecideInput(row));
    byCohort[decision.cohort] = (byCohort[decision.cohort] ?? 0) + 1;

    const common = {
      geo_code: decision.geoCode,
      id: decision.id,
      current_status: decision.currentStatus,
      current_sub_status: decision.currentSubStatus,
      cohort: decision.cohort,
      selected_by: selected,
      data_file_years: row.data_file_years ?? [],
      latest_event: row.next_new ?? null,
      event_created_at: row.event_created_at
        ? new Date(row.event_created_at).toISOString()
        : null
    };

    switch (decision.action) {
      case 'update':
        bySource[decision.source] = (bySource[decision.source] ?? 0) + 1;
        planLines.push(
          JSON.stringify({
            ...common,
            target_status: decision.targetStatus,
            target_sub_status: decision.targetSubStatus,
            source: decision.source
          })
        );
        break;
      case 'error':
        errorLines.push(JSON.stringify({ ...common, reason: decision.reason }));
        break;
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
    byCohort,
    bySource,
    bySelectedBy
  });
  logger.info('Wrote errors (unusable event — skip & log).', {
    path: errorsPath,
    errors: errorLines.length
  });
}
