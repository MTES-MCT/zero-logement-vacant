import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  count,
  createS3,
  flatten,
  groupBy,
  map
} from '@zerologementvacant/utils/node';
import async from 'async';
import fs from 'node:fs';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { match } from 'ts-pattern';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { refreshMultiOwnerFlags } from '~/repositories/ownerRepository';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import {
  createMultiBar,
  multiProgress
} from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  disableOwnersHousingTriggers,
  enableOwnersHousingTriggers,
  ensureKnownOwnersHousingTriggers,
  recomputeOwnersHousingCounts
} from '~/scripts/import-lovac/source-housing-owners/owners-housing-counts-maintenance';
import createSourceHousingOwnerFileRepository from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-file-repository';
import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { createSourceHousingOwnerEnricher } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-enricher';
import { createHousingOwnerLoader } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-loader';
import {
  createHousingOwnerTransform,
  HousingOwnerChange
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-transform';

const logger = createLogger('sourceHousingOwnerCommand');

// Concurrent department workers. Each holds its own pg connection, so a
// single LB-dropped socket only kills one worker, and per-connection
// lifetime is roughly 1/CONCURRENCY of the sequential runtime — well
// below typical cloud idle-timeout windows.
const CONCURRENCY = 4;
// DuckDB writes the per-dept output as a single file in
// `dept=NN/data_0.jsonl` (see prepare-housing-owners.sh).
const DEPT_FILE_NAME = 'data_0.jsonl';

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

export function createSourceHousingOwnerCommand() {
  const reporter = createLoggerReporter<SourceHousingOwner>();

  return async (deptsDir: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import housing owners');
      logger.debug('Starting source housing owner command...', {
        deptsDir,
        options
      });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      await ensureKnownOwnersHousingTriggers();

      // Discover per-dept directories produced by prepare-housing-owners.sh,
      // optionally filtered by --departments.
      const deptDirs = fs
        .readdirSync(deptsDir)
        .filter((d) => d.startsWith('dept='))
        .filter(
          (d) =>
            !options.departments?.length ||
            options.departments.includes(d.replace('dept=', ''))
        )
        .sort();

      logger.info(
        `Importing ${deptDirs.length} departments with concurrency ${CONCURRENCY}...`
      );

      const multi = createMultiBar();
      // Owner ids touched by any replace, collected across all parallel
      // workers via a shared Set passed into each loader instance. After
      // the stream drains, we refresh `owners.is_multi_owner` once for
      // the union — much cheaper than per-row recompute.
      const affectedOwnerIds = new Set<string>();

      if (!options.dryRun) {
        await disableOwnersHousingTriggers();
      }
      try {
        await async.mapLimit(deptDirs, CONCURRENCY, async (deptDir: string) => {
          const dept = deptDir.replace('dept=', '');
          const file = path.join(deptsDir, deptDir, DEPT_FILE_NAME);

          const repo = createSourceHousingOwnerFileRepository(file);
          const total = await count(
            repo.stream({ departments: options.departments })
          );
          const bar = multi.create(total, 0, { dept });

          await repo
            .stream({ departments: options.departments })
            .pipeThrough(multiProgress({ multiBar: multi, bar }))
            .pipeThrough(
              validator(sourceHousingOwnerSchema, {
                abortEarly: options.abortEarly,
                reporter
              })
            )
            .pipeThrough(
              groupBy((current, next) => current.local_id === next.local_id)
            )
            .pipeThrough(createSourceHousingOwnerEnricher())
            .pipeThrough(
              map(
                createHousingOwnerTransform({
                  abortEarly: options.abortEarly,
                  adminUserId: auth.id,
                  reporter,
                  year: options.year
                })
              )
            )
            .pipeThrough(flatten<HousingOwnerChange>())
            .pipeTo(
              createHousingOwnerLoader({
                dryRun: options.dryRun,
                reporter,
                affectedOwnerIds
              })
            );
        });
        multi.stop();
      } finally {
        if (!options.dryRun) {
          await enableOwnersHousingTriggers();
          await recomputeOwnersHousingCounts();
        }
      }

      if (!options.dryRun && affectedOwnerIds.size > 0) {
        logger.info('Refreshing multi-owner flags...', {
          count: affectedOwnerIds.size
        });
        await refreshMultiOwnerFlags([...affectedOwnerIds]);
      }

      logger.info(`Directory ${deptsDir} imported.`);
    } finally {
      reporter.report();
      await writeReport(deptsDir, options, reporter);
      console.timeEnd('Import housing owners');
    }
  };
}

async function writeReport(
  deptsDir: string,
  options: ExecOptions,
  reporter: Reporter<SourceHousingOwner>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options)
      .with({ from: 's3' }, async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `${deptsDir}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with({ from: 'file' }, async () => {
        writeFileSync(
          `./import-lovac-${options.year}-housing-owners.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
