import { count, createS3, map } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { match } from 'ts-pattern';
import { writeFileSync } from 'node:fs';

import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';
import { createOwnerEnricher } from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { createOwnerLoader } from '~/scripts/import-lovac/source-owners/source-owner-loader';
import { createOwnerTransform } from '~/scripts/import-lovac/source-owners/source-owner-transform';
import { createSourceOwnerRepository } from '~/scripts/import-lovac/source-owners/source-owner-repository';

const logger = createLogger('sourceOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

export function createSourceOwnerCommand() {
  const reporter = createLoggerReporter<SourceOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import owners');
      logger.info('Computing total...', { file });
      const total = await count(
        createSourceOwnerRepository({
          from: options.from,
          file,
          ...config.s3
        }).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file, total });
      await createSourceOwnerRepository({
        from: options.from,
        file,
        ...config.s3
      })
        .stream({ departments: options.departments })
        .pipeThrough(
          progress({
            initial: 0,
            total,
            name: 'Importing owners'
          })
        )
        .pipeThrough(
          validator(sourceOwnerSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeThrough(createOwnerEnricher())
        .pipeThrough(
          map(
            createOwnerTransform({
              reporter,
              abortEarly: options.abortEarly,
              year: options.year
            })
          )
        )
        .pipeTo(createOwnerLoader({ dryRun: options.dryRun, reporter }));

      logger.info(`File ${file} imported.`);
    } finally {
      reporter.report();
      await writeReport(file, options, reporter);
      console.timeEnd('Import owners');
    }
  };
}

async function writeReport(
  file: string,
  options: ExecOptions,
  reporter: Reporter<SourceOwner>
): Promise<void> {
  const json = JSON.stringify(reporter.getSummary(), null, 2);
  try {
    await match(options)
      .with({ from: 's3' }, async () => {
        const s3 = createS3(config.s3);
        await s3.send(
          new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: `${file}.report.json`,
            Body: json,
            ContentType: 'application/json'
          })
        );
      })
      .with({ from: 'file' }, async () => {
        writeFileSync(
          `./import-lovac-${options.year}-owners.report.json`,
          json,
          'utf8'
        );
      })
      .exhaustive();
  } catch (error) {
    logger.warn('Failed to write report', { error });
  }
}
