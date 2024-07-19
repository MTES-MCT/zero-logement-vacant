import { createLogger } from '~/infra/logger';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import {
  SourceOwner,
  sourceOwnerSchema
} from '~/scripts/import-lovac/source-owners/source-owner';
import { countLines } from '@zerologementvacant/utils';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import createSourceOwnerFileRepository from '~/scripts/import-lovac/source-owners/source-owner-file-repository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import sourceOwnerProcessor from '~/scripts/import-lovac/source-owners/source-owner-processor';
import { Owners } from '~/repositories/ownerRepository';

const logger = createLogger('sourceOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  dryRun?: boolean;
}

export function createSourceOwnerCommand() {
  const reporter = createLoggerReporter<SourceOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      if (options.dryRun) {
        logger.info('Dry run enabled');
      }

      logger.info('Computing total...');
      const total = await countLines(Readable.toWeb(fs.createReadStream(file)));

      logger.info('Starting import...', { file });
      await createSourceOwnerFileRepository(file)
        .stream()
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
            reporter,
            async saveOwner(owner): Promise<void> {
              if (!options.dryRun) {
                await Owners()
                  .insert(owner)
                  .onConflict(['idpersonne'])
                  .merge([
                    'full_name',
                    'dgfip_address',
                    'data_source',
                    'kind_class',
                    'birth_date',
                    'siren',
                    'updated_at'
                  ]);
              }
            }
          })
        );
    } finally {
      reporter.report();
    }
  };
}
