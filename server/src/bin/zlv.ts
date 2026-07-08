import { Command } from '@commander-js/extra-typings';

import { repairCommand } from '../scripts/repairs/cli';

const program = new Command('zlv')
  .description('ZLV developer CLI')
  .version('0.1.0');

program.addCommand(repairCommand());

program.parseAsync(process.argv).then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
