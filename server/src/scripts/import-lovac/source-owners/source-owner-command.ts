import { map, count, createS3 } from '@zerologementvacant/utils/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';
import { writeFileSync } from 'node:fs';
import db from '~/infra/database';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import {
  Owners,
  OwnerRecordDBO,
  ownerTable
} from '~/repositories/ownerRepository';
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
import {
  createOwnerTransform,
  OwnerChange
} from '~/scripts/import-lovac/source-owners/source-owner-transform';
import { createSourceOwnerRepository } from '~/scripts/import-lovac/source-owners/source-owner-repository';

const logger = createLogger('sourceOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
  year: string;
}

const CHUNK_SIZE = 1_000;
const UPSERT_COLUMNS = [
  'full_name',
  'birth_date',
  'siren',
  'address_dgfip',
  'kind_class',
  'data_source',
  'updated_at'
] as const;

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
        .pipeTo(createOwnerLoadSink(options, reporter));

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

function createOwnerLoadSink(
  options: ExecOptions,
  reporter: Reporter<SourceOwner>
): WritableStream<OwnerChange> {
  const insertBuffer: OwnerRecordDBO[] = [];
  const upsertBuffer: OwnerRecordDBO[] = [];

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} owners...`);
    await Owners().insert(batch);
    reporter.created(batch.length);
  }

  async function flushUpserts(): Promise<void> {
    if (upsertBuffer.length === 0) return;
    const batch = upsertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Upserting ${batch.length} owners...`);
    await db.transaction(async (trx) => {
      await trx(ownerTable)
        .insert(batch)
        .onConflict('idpersonne')
        .merge([...UPSERT_COLUMNS]);
    });
    reporter.updated(batch.length);
  }

  return new WritableStream<OwnerChange>({
    async write(change) {
      await match(change)
        .with({ kind: 'create' }, async (c) => {
          insertBuffer.push(c.value);
          if (insertBuffer.length >= CHUNK_SIZE) await flushInserts();
        })
        .with({ kind: 'update' }, async (c) => {
          upsertBuffer.push(c.value);
          if (upsertBuffer.length >= CHUNK_SIZE) await flushUpserts();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([flushInserts(), flushUpserts()]);
    }
  });
}
