import commander from '@commander-js/extra-typings';

import { createLogger } from '~/infra/logger';
import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/source-housing-command';
import { createSourceOwnerCommand } from '~/scripts/import-lovac/source-owners/source-owner-command';
import { createHistoryCommand } from '~/scripts/import-lovac/history/history-command';
import { createSourceHousingOwnerCommand } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-command';
import { createSourceBuildingCommand } from '~/scripts/import-lovac/source-buildings/source-building-command';

const logger = createLogger('cli');

const program = new commander.Command()
  .name('import-lovac')
  .description('Import LOVAC housings, owners and their relations');

const abortEarly = program.createOption(
  '-a, --abort-early',
  'Abort the script on the first error'
);
const departments = program.createOption(
  '--departments <departments...>',
  'Filter the departments to import'
);
const dryRun = program.createOption(
  '-d, --dry-run',
  'Run the script without saving to the database'
);

program.hook('preAction', (_, actionCommand) => {
  logger.info('Options', actionCommand.opts());
});

program
  .command('history')
  .description(
    'Import housing history from a file. It should run exactly once, after importing housings'
  )
  .argument('<file>', 'The file to import in .csv or .jsonl')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .action(async (file, options) => {
    const command = createHistoryCommand();
    await command(file, options).finally(() => {
      process.exit();
    });
  });

program
  .command('owners')
  .description('Import owners from a file to an existing database')
  .argument('<file>', 'The file to import in .csv or .jsonl')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
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
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .action(async (file, options) => {
    const command = createSourceHousingCommand();
    await command(file, options).finally(() => {
      process.exit();
    });
  });

program
  .command('housing-owners')
  .description('Import housing owners from a file to an existing database')
  .argument('<file>', 'The file to import in .csv or .jsonl')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .action(async (file, options) => {
    const command = createSourceHousingOwnerCommand();
    await command(file, options).finally(() => {
      process.exit();
    });
  });

program
  .command('buildings')
  .description('Import buildings from a file to an existing database')
  .argument('<file>', 'The file to import in .csv or .jsonl')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .action(async (file, options) => {
    const command = createSourceBuildingCommand();
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
