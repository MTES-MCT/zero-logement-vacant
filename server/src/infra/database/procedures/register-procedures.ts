import fs from 'node:fs/promises';
import path from 'node:path';

import db from '~/infra/database/';
import { logger } from '~/infra/logger';

async function run(): Promise<void> {
  async function load(path: string): Promise<void> {
    logger.info(`Loading procedure ${path}...`);
    const procedure = await fs.readFile(path, 'utf-8');
    await db.schema.raw(procedure);
    logger.info(`Procedure ${path} loaded.`);
  }

  const files = await fs.readdir(import.meta.dirname, 'utf-8');
  const procedures = files
    .filter((file) => file.endsWith('.sql'))
    .map((file) => path.join(import.meta.dirname, file));
  await Promise.all(procedures.map(load));
}

run()
  .catch(logger.error.bind(logger))
  .finally(() => db.destroy());
