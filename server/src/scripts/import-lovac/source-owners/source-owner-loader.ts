import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import {
  Owners,
  OwnerRecordDBO,
  ownerTable
} from '~/repositories/ownerRepository';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { OwnerChange } from '~/scripts/import-lovac/source-owners/source-owner-transform';

const logger = createLogger('createOwnerLoader');

const CHUNK_SIZE = 1_000;
const UPSERT_COLUMNS = [
  'full_name',
  'username',
  'birth_date',
  'siren',
  'address_dgfip',
  'kind_class',
  'data_source',
  'updated_at'
] as const;

export interface OwnerLoaderOptions {
  dryRun?: boolean;
  reporter: Reporter<SourceOwner>;
}

export function createOwnerLoader(
  options: OwnerLoaderOptions
): WritableStream<OwnerChange> {
  const insertBuffer: OwnerRecordDBO[] = [];
  const upsertBuffer: OwnerRecordDBO[] = [];
  // Collect idpersonne → owner_uid mappings for the bulk id migration
  const idMappings = new Map<string, string>();

  async function flushInserts(): Promise<void> {
    if (insertBuffer.length === 0) return;
    const batch = insertBuffer.splice(0);
    if (options.dryRun) return;
    logger.debug(`Inserting ${batch.length} owners...`);
    await Owners().insert(batch).onConflict('id').ignore();
    options.reporter.created(batch.length);
  }

  async function flushUpserts(): Promise<void> {
    if (upsertBuffer.length === 0) return;
    const batch = upsertBuffer.splice(0);
    for (const record of batch) {
      if (record.idpersonne) {
        idMappings.set(record.idpersonne, record.id);
      }
    }
    if (options.dryRun) return;
    logger.debug(`Upserting ${batch.length} owners...`);
    await db.transaction(async (trx) => {
      await trx(ownerTable)
        .insert(batch)
        .onConflict('idpersonne')
        .merge([...UPSERT_COLUMNS]);
    });
    options.reporter.updated(batch.length);
  }

  async function migrateOwnerIds(): Promise<void> {
    if (options.dryRun || idMappings.size === 0) return;
    logger.info(`Migrating ${idMappings.size} owner ids...`);

    await db.transaction(async (trx) => {
      logger.info('Creating id mapping table...');
      await trx.raw(
        'CREATE TEMP TABLE owner_id_map (idpersonne TEXT PRIMARY KEY, new_id UUID NOT NULL)'
      );

      const entries = Array.from(idMappings.entries());
      for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        await trx('owner_id_map').insert(
          chunk.map(([idpersonne, new_id]) => ({ idpersonne, new_id }))
        );
      }
      logger.info(`Inserted ${idMappings.size} mappings.`);

      // Collect FK constraints referencing owners(id) so we can
      // drop them before updating ids and restore them afterward.
      const { rows: constraints } = await trx.raw<{
        rows: Array<{
          conname: string;
          table_name: string;
          definition: string;
        }>;
      }>(`
        SELECT conname,
               conrelid::regclass::text AS table_name,
               pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE confrelid = 'owners'::regclass AND contype = 'f'
      `);
      logger.info(
        `Found ${constraints.length} FK constraints: ${constraints.map((c) => `${c.table_name}.${c.conname}`).join(', ')}`
      );

      for (const { conname, table_name } of constraints) {
        logger.debug(`Dropping constraint ${table_name}.${conname}...`);
        await trx.raw(`ALTER TABLE ?? DROP CONSTRAINT ??`, [
          table_name,
          conname
        ]);
      }
      logger.info('Dropped FK constraints.');

      // Update FK columns in referencing tables
      const fkTables = [...new Set(constraints.map((c) => c.table_name))];
      for (const table of fkTables) {
        logger.info(`Updating owner_id in ${table}...`);
        await trx.raw(
          `UPDATE ?? SET owner_id = m.new_id
           FROM owner_id_map m
           JOIN ?? o ON o.idpersonne = m.idpersonne
           WHERE ??.owner_id = o.id AND o.id != m.new_id`,
          [table, ownerTable, table]
        );
      }

      logger.info('Updating owners.id...');
      await trx.raw(
        `UPDATE ?? SET id = m.new_id
         FROM owner_id_map m
         WHERE ??.idpersonne = m.idpersonne AND ??.id != m.new_id`,
        [ownerTable, ownerTable, ownerTable]
      );

      // Restore FK constraints
      for (const { conname, table_name, definition } of constraints) {
        logger.debug(`Restoring constraint ${table_name}.${conname}...`);
        await trx.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? ${definition}`, [
          table_name,
          conname
        ]);
      }
      logger.info('Restored FK constraints.');

      await trx.raw('DROP TABLE owner_id_map');
    });

    logger.info('Owner id migration complete.');
  }

  return new WritableStream<OwnerChange>({
    async write(change) {
      await match(change)
        .with({ kind: 'create' }, async (c) => {
          insertBuffer.push(c.value);
          if (insertBuffer.length >= CHUNK_SIZE) await flushInserts();
        })
        .with({ kind: 'update' }, async (c) => {
          upsertBuffer.push(c.value);
          if (upsertBuffer.length >= CHUNK_SIZE) await flushUpserts();
        })
        .exhaustive();
    },
    async close() {
      await Promise.all([flushInserts(), flushUpserts()]);
      await migrateOwnerIds();
    }
  });
}
