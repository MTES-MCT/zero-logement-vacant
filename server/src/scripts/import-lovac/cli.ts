import commander from '@commander-js/extra-typings';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { noop } from 'ts-essentials';

import { countLines } from '@zerologementvacant/utils';
import createSourceOwnerFileRepository from '~/scripts/import-lovac/source-owners/source-owner-file-repository';
import sourceOwnerProcessor from '~/scripts/import-lovac/source-owners/source-owner-processor';
import { createLoggerReporter } from '~/scripts/import-lovac/infra/reporters/logger-reporter';
import { createLogger } from '~/infra/logger';
import ownerRepository from '~/repositories/ownerRepository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/validator';
import { sourceOwnerSchema } from '~/scripts/import-lovac/source-owners/source-owner';

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
          ownerRepository: {
            save: options.dryRun
              ? async (...args) => noop(...args)
              : ownerRepository.betterSave
          },
          reporter
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

function onSignal(): void {
  logger.info('Stopping import...');
  reporter.report();
  process.exit();
}

process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

program.parseAsync(process.argv).catch(console.error);