import commander from '@commander-js/extra-typings';

import { createLogger } from '~/infra/logger';
import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/command';
import { createSourceOwnerCommand } from '~/scripts/import-lovac/source-owners/command';

const logger = createLogger('cli');

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
    const command = createSourceOwnerCommand();
    await command(file, options).finally(() => {
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
      process.exit();
    });
  });

function onSignal(): void {
  logger.info('Stopping import...');
  process.exit();
}

process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

export default program;
