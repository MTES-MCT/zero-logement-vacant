import { count } from '@zerologementvacant/utils/node';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { DepartmentalOwners } from '~/repositories/departmentalOwnersRepository';
import { Owners } from '~/repositories/ownerRepository';
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

export function createSourceOwnerCommand() {
  const reporter = createLoggerReporter<SourceOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      logger.info('Computing total...');
      const total = await count(
        createSourceOwnerFileRepository(file).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      await createSourceOwnerFileRepository(file)
        .stream({ departments: options.departments })
        .pipeThrough(
          progress({
            initial: 0,
            total: total
          })
        )
        .pipeThrough(
          validator(sourceOwnerSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeTo(
          sourceOwnerProcessor({
            abortEarly: options.abortEarly,
            reporter,
            async saveOwner(owner): Promise<void> {
              if (!options.dryRun) {
                await db.transaction(async (transaction) => {
                  const [{ id }] = await Owners(transaction)
                    .insert(owner)
                    .onConflict(['idpersonne'])
                    .merge([
                      'full_name',
                      'address_dgfip',
                      'data_source',
                      'kind_class',
                      'birth_date',
                      'siren',
                      'updated_at'
                    ])
                    .returning(['id']);
                  await DepartmentalOwners(transaction)
                    .insert({
                      owner_id: id,
                      owner_idpersonne: owner.idpersonne as string
                    })
                    .onConflict(['owner_idpersonne'])
                    .merge(['owner_id']);
                });
              }
            }
          })
        );
    } finally {
      reporter.report();
    }
  };
}
