import fs from 'fs/promises';

import db from '../../server/repositories/db';
import path from 'path';

async function run(): Promise<void> {
  async function load(path: string): Promise<void> {
    console.log(`Loading procedure ${path}...`);
    const procedure = await fs.readFile(path, 'utf-8');
    await db.schema.raw(procedure);
    console.log(`Procedure ${path} loaded.`);
  }

  const files = await fs.readdir(__dirname, 'utf-8');
  const procedures = files
    .filter((file) => file.endsWith('.sql'))
    .map((file) => path.join(__dirname, file));
  await Promise.all(procedures.map(load));
}

run()
  .catch(console.error)
  .finally(() => db.destroy());
