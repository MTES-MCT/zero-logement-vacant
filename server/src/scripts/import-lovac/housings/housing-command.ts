import {
  DataFileYear,
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import { count, createS3, flatten, map } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'node:fs';
import { match } from 'ts-pattern';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createExistingHousingLoader } from './housing-loader';
import { createExistingHousingTransform } from './housing-transform';
import type { HousingFiltersApi } from '~/models/HousingFiltersApi';

const logger = createLogger('existingHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from?: FromOptionValue;
  year: DataFileYear;
}

export function createExistingHousingCommand() {
  const reporter = createLoggerReporter<HousingApi>();

  return async (options: ExecOptions): Promise<void> => {
    try {
      console.time('Verify existing housings');
      logger.debug('Starting existing housing command...', { options });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      logger.info('Disabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing DISABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing DISABLE TRIGGER housing_delete_building_trigger;
      `);

      console.log('Counting...');
      const filters: HousingFiltersApi = {
        departments: options.departments,
        dataFileYearsExcluded: [options.year],
        occupancies: [Occupancy.VACANT],
        statusList: [HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING]
      };
      const { housing: total } = await housingRepository.count(filters);
      console.log(`Counted ${total} housings.`);

      logger.info('Starting verification...', { total });
      await housingRepository
        .stream({ filters })
        .pipeThrough(
          progress({
            initial: 0,
            total,
            name: 'Verifying existing housings'
          })
        )
        .pipeThrough(
          map(
            createExistingHousingTransform({
              auth,
              year: options.year as DataFileYear,
              reporter,
              abortEarly: options.abortEarly
            })
          )
        )
        .pipeThrough(flatten())
        .pipeTo(
          createExistingHousingLoader({ dryRun: options.dryRun, reporter })
        );
      logger.info('Verification done.');
    } finally {
      logger.info('Enabling building triggers...');
      await db.raw(`
        ALTER TABLE fast_housing ENABLE TRIGGER housing_insert_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_update_building_trigger;
        ALTER TABLE fast_housing ENABLE TRIGGER housing_delete_building_trigger;
      `);

      reporter.report();
      await writeReport(options, reporter);
      console.timeEnd('Verify existing housings');
    }
  };
}

async function writeReport(
  options: ExecOptions,
  reporter: Reporter<HousingApi>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options.from ?? 'file')
      .with('s3', async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `existing-housings/${options.year}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with('file', async () => {
        writeFileSync(
          `./import-lovac-${options.year}-existing-housings.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
