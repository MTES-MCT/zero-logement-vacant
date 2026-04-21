import { program } from '@commander-js/extra-typings';

import { createLogger } from '~/infra/logger';
import { createHistoryCommand } from '~/scripts/import-lovac/history/history-command';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { createSourceHousingOwnerCommand } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-command';
import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/source-housing-command';
import { createExistingHousingCommand } from '~/scripts/import-lovac/housings/housing-command';
import { createSourceOwnerCommand } from '~/scripts/import-lovac/source-owners/source-owner-command';

const logger = createLogger('cli');

program
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
const from = program
  .createOption(
    '-f, --from <from>',
    'The location where the input file is stored'
  )
  .choices<FromOptionValue[]>(['file', 's3'])
  .default<FromOptionValue>('s3');
const year = program
  .createOption('--year <year>', 'LOVAC year identifier (e.g. lovac-2026)')
  .makeOptionMandatory();

program.hook('preAction', (_, actionCommand) => {
  logger.info('Options', actionCommand.opts());
});

program
  .command('history')
  .description(
    'Import housing history from a file. It should run exactly once, after importing housings'
  )
  .argument('<file>', 'The .jsonl file to import')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(year)
  .action(async (file, options) => {
    const command = createHistoryCommand();
    await command(file, options).then(() => {
      process.exit();
    });
  });

program
  .command('owners')
  .description('Import owners from a file to an existing database')
  .argument('<file>', 'The .jsonl file to import')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(from)
  .addOption(year)
  .action(async (file, options) => {
    const command = createSourceOwnerCommand();
    await command(file, options).then(() => {
      process.exit();
    });
  });

program
  .command('housings')
  .description('Import housings from a file to an existing database')
  .argument('<file>', 'The .jsonl file to import')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(from)
  .addOption(year)
  .action(async (file, options) => {
    const command = createSourceHousingCommand();
    await command(file, options).then(() => {
      process.exit();
    });
  });

program
  .command('housing-owners')
  .description('Import housing owners from a file to an existing database')
  .argument('<file>', 'The .jsonl file to import')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(from)
  .addOption(year)
  .action(async (file, options) => {
    const command = createSourceHousingOwnerCommand();
    await command(file, options).then(() => {
      process.exit();
    });
  });

program
  .command('existing-housings')
  .description(
    'Verify existing housings against the imported LOVAC year. Resets occupancy/status for housings missing from the file. Run after `housings`.'
  )
  .addOption(abortEarly)
  .addOption(dryRun)
  .addOption(year)
  .action(async (options) => {
    const command = createExistingHousingCommand();
    await command(options).then(() => {
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
