import fs from 'fs/promises';

import db from '../../server/repositories/db';
import path from 'path';
import { logger } from '../../server/utils/logger';

async function run(): Promise<void> {
  async function load(path: string): Promise<void> {
    logger.info(`Loading procedure ${path}...`);
    const procedure = await fs.readFile(path, 'utf-8');
    await db.schema.raw(procedure);
    logger.info(`Procedure ${path} loaded.`);
  }

  const files = await fs.readdir(__dirname, 'utf-8');
  const procedures = files
    .filter((file) => file.endsWith('.sql'))
    .map((file) => path.join(__dirname, file));
  await Promise.all(procedures.map(load));
}

run()
  .catch(logger.error.bind(logger))
  .finally(() => db.destroy());
