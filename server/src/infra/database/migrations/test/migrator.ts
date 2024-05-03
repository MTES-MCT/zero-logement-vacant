import async from 'async';
import { Knex } from 'knex';

import { logger } from '~/infra/logger';

interface Migration {
  file: string;
}

interface Migrator extends Knex.Migrator {
  migrateUntil(name: string): Promise<void>;
}

const createMigrator = (db: Knex): Migrator => ({
  currentVersion: (...args) => db.migrate.currentVersion(...args),
  down: (...args) => db.migrate.down(...args),
  forceFreeMigrationsLock: (...args) =>
    db.migrate.forceFreeMigrationsLock(...args),
  latest: (...args) => db.migrate.latest(...args),
  list: (...args) => db.migrate.list(...args),
  make: (...args) => db.migrate.make(...args),
  rollback: (...args) => db.migrate.rollback(...args),
  status: (...args) => db.migrate.status(...args),
  up: (...args) => db.migrate.up(...args),

  async migrateUntil(name: string): Promise<void> {
    const [completed, pending]: [Migration[], Migration[]] =
      await db.migrate.list();

    const isCompleted = completed
      .map((migration) => migration.file)
      .includes(name);
    if (isCompleted) {
      throw new Error(`${name} was already migrated.`);
    }

    const index = pending.findIndex((migration) => migration.file === name);
    if (index === -1) {
      throw new Error(`Migration ${name} not found.`);
    }

    const migrations = pending.slice(0, index);
    await async.forEachSeries(migrations, async (migration) => {
      await db.migrate.up({ name: migration.file });
      logger.info(`Migrated ${migration.file}.`);
    });
  },
});

export default createMigrator;
