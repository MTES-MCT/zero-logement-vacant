import commander from '@commander-js/extra-typings';
import fs from 'node:fs';
import { Readable } from 'node:stream';

import { countLines } from '@zerologementvacant/utils';
import createSourceOwnerFileRepository from '~/scripts/import-lovac/source-owners/source-owner-file-repository';
import sourceOwnerProcessor from '~/scripts/import-lovac/source-owners/source-owner-processor';
import { createLoggerReporter } from '~/scripts/import-lovac/infra/reporters/logger-reporter';
import { createLogger } from '~/infra/logger';
import { Owners } from '~/repositories/ownerRepository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import { sourceOwnerSchema } from '~/scripts/import-lovac/source-owners/source-owner';
import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/command';

const logger = createLogger('cli');
const reporter = createLoggerReporter();

const program = new commander.Command();
program
  .name('import-lovac')
  .description('Import LOVAC housings, owners and their relations');

program
  .command('owners')
  .description('Import owners from a file to an existing database')
  .argument('<file>', 'The file to import in .csv or .jsonl')
  .option('-d, --dry-run', 'Run the script without saving to the database')
  .action(async (file, options) => {
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
                  'administrator',
                  'siren'
                ]);
            }
          }
        })
      )
      .catch((error) => {
        logger.error(error);
      })
      .finally(() => {
        reporter.report();
        process.exit();
      });
  });

program
  .command('housings')
  .description('Import housings from a file to an existing database')
  .argument('<file>', 'The file to import in .csv or .jsonl')
  .option('-a, --abort-early', 'Abort the script on the first error')
  .option('-d, --dry-run', 'Run the script without saving to the database')
  .action(async (file, options) => {
    const command = createSourceHousingCommand();
    await command(file, options).finally(() => {
      reporter.report();
      process.exit();
    });
  });

function onSignal(): void {
  logger.info('Stopping import...');
  reporter.report();
  process.exit();
}

process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

export default program;
