import { Knex } from 'knex';
import fs from 'node:fs/promises';
import path from 'node:path';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

export class CustomMigrationSource implements Knex.MigrationSource<string> {
  async getMigrations(): Promise<string[]> {
    let dirents = await fs.readdir(
      path.join(import.meta.dirname, 'migrations'),
      {
        withFileTypes: true
      }
    );
    dirents = dirents.filter((dirent) => dirent.isFile());

    return dirents.map((dirent) => dirent.name);
  }
  getMigrationName(migration: string): string {
    return migration;
  }
  async getMigration(migration: string): Promise<Knex.Migration> {
    return await import(
      path.join(import.meta.dirname, 'migrations', migration)
    );
  }
}

export class CustomSeedSource implements Knex.SeedSource<string> {
  async getSeeds(options: Knex.SeederConfig): Promise<string[]> {
    const dirents = await fs.readdir(
      path.join(import.meta.dirname, 'seeds', config.db.env),
      {
        withFileTypes: true
      }
    );

    return dirents
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name)
      .filter((name) => (options.specific ? options.specific === name : true))
      .sort();
  }

  async getSeed(seed: string): Promise<Knex.Seed> {
    return import(path.join(import.meta.dirname, 'seeds', config.db.env, seed));
  }
}

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: config.db.url,
  acquireConnectionTimeout: 10_000,
  pool: {
    min: 0,
    max: config.db.pool.max
  },
  log: {
    debug: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message)
  },
  migrations: {
    tableName: 'knex_migrations',
    // Custom migration and seed sources are needed to support ESM imports.
    // See this issue: https://github.com/knex/knex/issues/5323
    migrationSource: new CustomMigrationSource()
  },
  seeds: {
    seedSource: new CustomSeedSource(),
    timestampFilenamePrefix: true
  }
};

export default knexConfig;
