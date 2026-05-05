/**
 * Benchmark: housingRepository.count() — timing + EXPLAIN ANALYZE
 *
 * Measures count query performance for several filter scenarios.
 * Run BEFORE and AFTER the optimization commit to compare.
 *
 * Usage:
 *   NODE_OPTIONS='--import tsx/esm' node server/src/scripts/benchmark-count/index.ts
 *   NODE_OPTIONS='--import tsx/esm' node server/src/scripts/benchmark-count/index.ts --explain
 *   NODE_OPTIONS='--import tsx/esm' node server/src/scripts/benchmark-count/index.ts --iterations=10
 *
 * Compare old vs new:
 *   git stash
 *   NODE_OPTIONS='--import tsx/esm' node server/src/scripts/benchmark-count/index.ts > before.txt
 *   git stash pop
 *   NODE_OPTIONS='--import tsx/esm' node server/src/scripts/benchmark-count/index.ts > after.txt
 *   diff before.txt after.txt
 */

import { AddressKinds } from '@zerologementvacant/models';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import establishmentRepository from '~/repositories/establishmentRepository';
import housingRepository from '~/repositories/housingRepository';
import {
  housingTable,
  ownerHousingJoinClause
} from '~/repositories/housingRepository';
import { banAddressesTable } from '~/repositories/banAddressesRepository';
import { housingOwnersTable } from '~/repositories/housingOwnerRepository';
import { ownerTable } from '~/repositories/ownerRepository';
import type { HousingFiltersApi } from '~/models/HousingFiltersApi';

const logger = createLogger('benchmark-count');
const EXPLAIN = process.argv.includes('--explain');
const ITERATIONS = Number(
  process.argv.find((a) => a.startsWith('--iterations='))?.split('=')[1] ?? 5
);

// ---------------------------------------------------------------------------
// Minimal query reconstructions for EXPLAIN ANALYZE
// These reproduce the structural difference (joins/selects) with geo filter only.
// ---------------------------------------------------------------------------

function oldQuery(localities: string[]) {
  return db
    .with(
      'list',
      db
        .select(`${housingTable}.*`)
        .from(housingTable)
        .leftJoin(housingOwnersTable, ownerHousingJoinClause)
        .leftJoin(
          ownerTable,
          `${housingOwnersTable}.owner_id`,
          `${ownerTable}.id`
        )
        .select(`${ownerTable}.id as owner_id`)
        .select(db.raw(`to_json(${ownerTable}.*) AS owner`))
        .leftJoin({ ban: banAddressesTable }, (join) => {
          join
            .on(`${ownerTable}.id`, 'ban.ref_id')
            .andOnVal('address_kind', AddressKinds.Owner);
        })
        .select(db.raw('to_json(ban.*) AS owner_ban_address'))
        .whereIn(`${housingTable}.geo_code`, localities)
    )
    .countDistinct('id as housing')
    .countDistinct('owner_id as owners')
    .from('list');
}

function newQuery(localities: string[]) {
  return db(housingTable)
    .leftJoin(housingOwnersTable, ownerHousingJoinClause)
    .whereIn(`${housingTable}.geo_code`, localities)
    .countDistinct(`${housingTable}.id as housing`)
    .countDistinct(`${housingOwnersTable}.owner_id as owners`);
}

// Change 1 — ownerIds: OLD joins owners table, NEW uses housing_owners only

function ownerIdsOldQuery(localities: string[], ownerId: string) {
  return db(housingTable)
    .leftJoin(housingOwnersTable, ownerHousingJoinClause)
    .leftJoin(ownerTable, `${housingOwnersTable}.owner_id`, `${ownerTable}.id`)
    .whereIn(`${housingTable}.geo_code`, localities)
    .whereIn(`${ownerTable}.id`, [ownerId])
    .countDistinct(`${housingTable}.id as housing`)
    .countDistinct(`${housingOwnersTable}.owner_id as owners`);
}

function ownerIdsNewQuery(localities: string[], ownerId: string) {
  return db(housingTable)
    .leftJoin(housingOwnersTable, ownerHousingJoinClause)
    .whereIn(`${housingTable}.geo_code`, localities)
    .whereIn(`${housingOwnersTable}.owner_id`, [ownerId])
    .countDistinct(`${housingTable}.id as housing`)
    .countDistinct(`${housingOwnersTable}.owner_id as owners`);
}

// Change 2 — beneficiaryCounts: OLD scans full housing_owners, NEW pushes geo filter into subquery

function beneficiaryCountsOldQuery(localities: string[], count: number) {
  return db(housingTable)
    .leftJoin(housingOwnersTable, ownerHousingJoinClause)
    .whereIn(`${housingTable}.geo_code`, localities)
    .whereIn([`${housingTable}.geo_code`, `${housingTable}.id`], (subquery) => {
      subquery
        .select(
          `${housingOwnersTable}.housing_geo_code`,
          `${housingOwnersTable}.housing_id`
        )
        .from(housingOwnersTable)
        .where(`${housingOwnersTable}.rank`, '>=', 1)
        .groupBy(
          `${housingOwnersTable}.housing_geo_code`,
          `${housingOwnersTable}.housing_id`
        )
        .havingRaw('COUNT(*) = ?', [count]);
    })
    .countDistinct(`${housingTable}.id as housing`)
    .countDistinct(`${housingOwnersTable}.owner_id as owners`);
}

function beneficiaryCountsNewQuery(localities: string[], count: number) {
  return db(housingTable)
    .leftJoin(housingOwnersTable, ownerHousingJoinClause)
    .whereIn(`${housingTable}.geo_code`, localities)
    .whereIn([`${housingTable}.geo_code`, `${housingTable}.id`], (subquery) => {
      subquery
        .select(
          `${housingOwnersTable}.housing_geo_code`,
          `${housingOwnersTable}.housing_id`
        )
        .from(housingOwnersTable)
        .where(`${housingOwnersTable}.rank`, '>=', 1)
        .whereIn(`${housingOwnersTable}.housing_geo_code`, localities)
        .groupBy(
          `${housingOwnersTable}.housing_geo_code`,
          `${housingOwnersTable}.housing_id`
        )
        .havingRaw('COUNT(*) = ?', [count]);
    })
    .countDistinct(`${housingTable}.id as housing`)
    .countDistinct(`${housingOwnersTable}.owner_id as owners`);
}

// ---------------------------------------------------------------------------
// Count scenarios — exercising different filter paths
// ---------------------------------------------------------------------------

type Scenario = {
  name: string;
  filters: Omit<HousingFiltersApi, 'establishmentIds' | 'localities'>;
};

const baseScenarios: Scenario[] = [
  { name: 'No extra filters', filters: {} },
  { name: 'Status filter', filters: { statusList: [0, 1, 2] } },
  {
    name: 'Owner kind (triggers owner join)',
    filters: { ownerKinds: ['particulier'] }
  },
  {
    name: 'Campaign IDs (null = no campaign)',
    filters: { campaignIds: [null] }
  },
  {
    name: 'Owner kind + status combined',
    filters: { ownerKinds: ['particulier'], statusList: [0, 1] }
  }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function bench(fn: () => Promise<unknown>) {
  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t = performance.now();
    await fn();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  return {
    min: times[0],
    median: percentile(times, 50),
    p95: percentile(times, 95)
  };
}

async function explainAnalyze(query: ReturnType<typeof db.raw | typeof db>) {
  const { sql, bindings } = (query as any).toSQL();
  const result = await db.raw(
    `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
    bindings as any
  );
  return (result as any).rows
    .map((r: Record<string, string>) => r['QUERY PLAN'])
    .join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const [establishment] = await establishmentRepository.find({
    filters: {
      siren: ['246700488']
    }
  });
  if (!establishment) {
    logger.error('No establishment found — populate the DB first');
    process.exit(1);
  }

  const localities = establishment.geoCodes;
  logger.info(
    `Establishment: "${establishment.name}" | ${localities.length} geo codes | ${ITERATIONS} iterations`
  );

  // Fetch a real owner ID from this establishment's housing for change-1 scenarios
  const ownerRow = await db(housingOwnersTable)
    .whereIn(`${housingOwnersTable}.housing_geo_code`, localities)
    .select(`${housingOwnersTable}.owner_id`)
    .first();
  const ownerId: string | undefined = ownerRow?.owner_id;

  const scenarios: Scenario[] = [
    ...baseScenarios,
    ...(ownerId
      ? [
          {
            name: 'Owner IDs filter (Change 1)',
            filters: { ownerIds: [ownerId] } as Scenario['filters']
          },
          {
            name: 'Multi owners = true (Change 1)',
            filters: { multiOwners: [true] } as Scenario['filters']
          }
        ]
      : []),
    {
      name: 'Beneficiary count = 2 (Change 2)',
      filters: { beneficiaryCounts: ['2'] }
    }
  ];

  if (EXPLAIN) {
    console.log('\n=== OLD (CTE + full owner join + to_json) ===');
    console.log(await explainAnalyze(oldQuery(localities)));

    console.log('\n=== NEW (direct aggregate, no data fetch) ===');
    console.log(await explainAnalyze(newQuery(localities)));

    if (ownerId) {
      console.log('\n=== Change 1 OLD (ownerIds: owners join + WHERE owners.id) ===');
      console.log(await explainAnalyze(ownerIdsOldQuery(localities, ownerId)));

      console.log('\n=== Change 1 NEW (ownerIds: housing_owners only + WHERE housing_owners.owner_id) ===');
      console.log(await explainAnalyze(ownerIdsNewQuery(localities, ownerId)));
    }

    console.log('\n=== Change 2 OLD (beneficiaryCounts: full housing_owners GROUP BY, no geo filter) ===');
    console.log(await explainAnalyze(beneficiaryCountsOldQuery(localities, 2)));

    console.log('\n=== Change 2 NEW (beneficiaryCounts: geo-filtered housing_owners GROUP BY) ===');
    console.log(await explainAnalyze(beneficiaryCountsNewQuery(localities, 2)));
    return;
  }

  // Timing benchmark
  console.log(
    '\n' +
      'Scenario'.padEnd(46) +
      'min (ms)'.padStart(10) +
      'median (ms)'.padStart(13) +
      'p95 (ms)'.padStart(10)
  );
  console.log('─'.repeat(79));

  for (const scenario of scenarios) {
    const filters: HousingFiltersApi = {
      ...scenario.filters,
      establishmentIds: [establishment.id],
      localities
    };

    const stats = await bench(() => housingRepository.count(filters));
    console.log(
      scenario.name.padEnd(46) +
        stats.min.toFixed(0).padStart(10) +
        stats.median.toFixed(0).padStart(13) +
        stats.p95.toFixed(0).padStart(10)
    );
  }
}

run()
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  })
  .finally(() => db.destroy());
