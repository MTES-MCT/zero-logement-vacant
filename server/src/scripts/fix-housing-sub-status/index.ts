import db from '~/infra/database';
import { createLogger } from '~/infra/logger';

import { apply } from './apply';
import { generate } from './generate';

const logger = createLogger('fix-housing-sub-status');

async function run(): Promise<void> {
  const mode = process.argv[2];
  switch (mode) {
    case 'generate':
      await generate();
      break;
    case 'apply':
      await apply({ dryRun: process.argv.includes('--dry-run') });
      break;
    default:
      logger.error(
        `Unknown mode "${mode ?? ''}". Usage: index.ts <generate|apply [--dry-run]>`
      );
      process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    logger.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
