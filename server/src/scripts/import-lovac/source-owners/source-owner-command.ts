import { isNotNull } from '@zerologementvacant/utils';
import { chunkify, count, filter, map } from '@zerologementvacant/utils/node';
import { Readable } from 'node:stream';
import { WritableStream } from 'node:stream/web';
import db, { countQuery } from '~/infra/database';

import { createLogger } from '~/infra/logger';
import { OwnerApi } from '~/models/OwnerApi';
import {
  formatOwnerApi,
  OwnerDBO,
  Owners,
  ownerTable
} from '~/repositories/ownerRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';
import createSourceOwnerFileRepository from '~/scripts/import-lovac/source-owners/source-owner-file-repository';
import sourceOwnerProcessor from '~/scripts/import-lovac/source-owners/source-owner-processor';

const logger = createLogger('sourceOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
}

const TEMPORARY_TABLE = 'owner_changes_tmp';

export function createSourceOwnerCommand() {
  const reporter = createLoggerReporter<SourceOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      console.time('Import');
      const tableExists = await db.schema.hasTable(TEMPORARY_TABLE);
      if (tableExists) {
        logger.info(
          `The temporary table "${TEMPORARY_TABLE} exists. Removing...`
        );
        await db.schema.dropTable(TEMPORARY_TABLE);
      }
      logger.info(`Creating the temporary table "${TEMPORARY_TABLE}"...`);
      await db.schema.createTableLike(TEMPORARY_TABLE, ownerTable);
      logger.info(`Created table ${TEMPORARY_TABLE}.`);

      logger.info('Computing total...');
      const total = await count(
        createSourceOwnerFileRepository(file).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      const [createes, updatees] = createSourceOwnerFileRepository(file)
        .stream({ departments: options.departments })
        .pipeThrough(
          progress({
            initial: 0,
            total: total,
            name: 'Import (1/2)'
          })
        )
        .pipeThrough(
          validator(sourceOwnerSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeThrough(
          sourceOwnerProcessor({
            abortEarly: options.abortEarly,
            reporter,
            ownerRepository: {
              async findOne(opts): Promise<OwnerDBO | null> {
                const owner = await Owners()
                  .where({
                    idpersonne: opts.idpersonne
                  })
                  .first();
                return owner ?? null;
              }
            }
          })
        )
        .tee();

      await Promise.all([
        createes
          .pipeThrough(filter(isNotNull))
          .pipeThrough(filter((change) => change.kind === 'create'))
          .pipeThrough(map((change) => change.value))
          .pipeThrough(
            chunkify({
              size: 1_000
            })
          )
          .pipeTo(
            new WritableStream({
              async write(changes: ReadonlyArray<OwnerApi>) {
                if (!options.dryRun) {
                  await insert(changes);
                }
              }
            })
          ),
        updatees
          .pipeThrough(filter(isNotNull))
          .pipeThrough(filter((change) => change.kind === 'update'))
          .pipeThrough(map((change) => change.value))
          .pipeThrough(
            chunkify({
              size: 1_000
            })
          )
          .pipeTo(
            // Write updates to a temporary table
            new WritableStream({
              async write(changes: ReadonlyArray<OwnerApi>) {
                if (!options.dryRun) {
                  const owners = changes.map(formatOwnerApi);
                  await db(TEMPORARY_TABLE).insert(owners);
                }
              }
            })
          )
      ]);

      // Update owners from the temporary table in bulk
      // to avoid multiple queries and improve performance
      const temporaryTableCount: number = await countQuery(db(TEMPORARY_TABLE));
      const temporaryOwners = Readable.toWeb(
        db(TEMPORARY_TABLE).select().orderBy('idpersonne').stream()
      );
      await temporaryOwners
        .pipeThrough(
          chunkify({
            size: 1_000
          })
        )
        .pipeThrough(
          progress({
            initial: 0,
            total: temporaryTableCount,
            name: 'Import (2/2)'
          })
        )
        .pipeTo(
          new WritableStream<ReadonlyArray<OwnerDBO>>({
            async write(changes) {
              if (!options.dryRun) {
                await update(changes);
              }
            }
          })
        );
      console.timeEnd('Import');
    } finally {
      const tableExists = await db.schema.hasTable(TEMPORARY_TABLE);
      if (tableExists) {
        logger.info(`Removing the temporary table "${TEMPORARY_TABLE}"...`);
        await db.schema.dropTable(TEMPORARY_TABLE);
        logger.info(`Removed table "${TEMPORARY_TABLE}".`);
      }

      reporter.report();
    }
  };
}

/**
 * Batch insert.
 * @param changes
 */
export async function insert(changes: ReadonlyArray<OwnerApi>): Promise<void> {
  logger.debug(`Inserting ${changes.length} owners...`);
  const owners = changes.map(formatOwnerApi);
  await Owners().insert(owners);
}

/**
 * Batch update from a temporary table.
 * @param changes
 */
export async function update(
  changes: ReadonlyArray<Pick<OwnerApi, 'id'>>
): Promise<void> {
  logger.debug(
    `Updating ${changes.length} owners from "${TEMPORARY_TABLE}"...`
  );
  const query = Owners()
    .updateFrom(TEMPORARY_TABLE)
    .update({
      full_name: db.ref(`${TEMPORARY_TABLE}.full_name`),
      birth_date: db.ref(`${TEMPORARY_TABLE}.birth_date`),
      administrator: db.ref(`${TEMPORARY_TABLE}.administrator`),
      siren: db.ref(`${TEMPORARY_TABLE}.siren`),
      address_dgfip: db.ref(`${TEMPORARY_TABLE}.address_dgfip`),
      additional_address: db.ref(`${TEMPORARY_TABLE}.additional_address`),
      email: db.ref(`${TEMPORARY_TABLE}.email`),
      phone: db.ref(`${TEMPORARY_TABLE}.phone`),
      data_source: db.ref(`${TEMPORARY_TABLE}.data_source`),
      kind_class: db.ref(`${TEMPORARY_TABLE}.kind_class`),
      owner_kind_detail: db.ref(`${TEMPORARY_TABLE}.owner_kind_detail`),
      updated_at: db.ref(`${TEMPORARY_TABLE}.updated_at`)
    })
    .where(`${ownerTable}.id`, db.ref(`${TEMPORARY_TABLE}.id`))
    .whereIn(
      `${TEMPORARY_TABLE}.id`,
      changes.map((change) => change.id)
    );

  console.log(query.toQuery());

  await query;
}
