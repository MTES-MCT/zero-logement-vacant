import {
  chunkify,
  count,
  createS3,
  filter,
  flatten,
  groupBy,
  map
} from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'node:fs';
import { WritableStream } from 'node:stream/web';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import eventRepository from '~/repositories/eventRepository';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { withinTransaction } from '~/infra/database/transaction';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { createSourceHousingOwnerEnricher } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-enricher';
import {
  createHousingOwnerTransform,
  HousingEventChange,
  HousingOwnerChange,
  HousingOwnersChange
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-transform';
import { createSourceHousingOwnerRepository } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-repository';
import { match } from 'ts-pattern';

const logger = createLogger('sourceHousingOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

export function createSourceHousingOwnerCommand() {
  const reporter = createLoggerReporter<SourceHousingOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import housing owners');
      logger.debug('Starting source housing owner command...', {
        file,
        options
      });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      logger.info('Computing total...');
      const total = await count(
        createSourceHousingOwnerRepository({
          ...config.s3,
          file: file,
          from: options.from
        }).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      const [housingOwnerStream, eventStream] =
        createSourceHousingOwnerRepository({
          ...config.s3,
          file: file,
          from: options.from
        })
          .stream({
            departments: options.departments
          })
          .pipeThrough(
            progress({
              initial: 0,
              total,
              name: '(1/1) Updating housing owners'
            })
          )
          .pipeThrough(
            validator(sourceHousingOwnerSchema, {
              abortEarly: options.abortEarly,
              reporter
            })
          )
          .pipeThrough(groupBy((a, b) => a.local_id === b.local_id))
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
          .tee();

      await Promise.all([
        // Update housing owners
        housingOwnerStream
          .pipeThrough(
            filter(
              (change): change is HousingOwnersChange =>
                change.type === 'housingOwners' && change.kind === 'replace'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeTo(
            new WritableStream<ReadonlyArray<HousingOwnerDBO>>({
              async write(housingOwners) {
                if (!options.dryRun && housingOwners.length > 0) {
                  const housingGeoCode = housingOwners[0].housing_geo_code;
                  const housingId = housingOwners[0].housing_id;
                  await withinTransaction(async (transaction) => {
                    await HousingOwners(transaction)
                      .where({
                        housing_geo_code: housingGeoCode,
                        housing_id: housingId
                      })
                      .delete();
                    await HousingOwners(transaction).insert(
                      housingOwners as HousingOwnerDBO[]
                    );
                  });
                }
              }
            })
          ),
        // Save events
        eventStream
          .pipeThrough(
            filter(
              (change): change is HousingEventChange =>
                change.type === 'event' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream({
              async write(events) {
                if (!options.dryRun) {
                  await eventRepository.insertManyHousingEvents(
                    events as unknown as HousingEventApi[]
                  );
                }
              }
            })
          )
      ]);

      logger.info(`File ${file} imported.`);
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      reporter.report();
      await writeReport(file, options, reporter);
      console.timeEnd('Import housing owners');
    }
  };
}

async function writeReport(
  file: string,
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
            Key: `${file}.report.json`,
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
