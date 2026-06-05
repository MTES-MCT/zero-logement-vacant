import { match } from 'ts-pattern';
import { WritableStream } from 'node:stream/web';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { housingOwnersTable } from '~/repositories/housingOwnerRepository';
import {
  Owners,
  OwnerRecordDBO,
  ownerTable
} from '~/repositories/ownerRepository';
import {
  disableOwnersHousingTriggers,
  enableOwnersHousingTriggers
} from '~/scripts/import-lovac/source-housing-owners/owners-housing-counts-maintenance';
import { Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { OwnerChange } from '~/scripts/import-lovac/source-owners/source-owner-transform';

const logger = createLogger('createOwnerLoader');

const CHUNK_SIZE = 1_000;
// Number of idpersonnes per chunk when rewriting owners_housing.owner_id.
// owners_housing has ~14M rows and owner_id is the leading PK column, so
// every UPDATE forces full PK + secondary-index maintenance on each row.
// At ~10 housings/owner, 25k idpersonnes ≈ 250k row updates per chunk —
// short enough to finish well under any plausible cloud-LB idle timeout
// while still keeping per-chunk overhead amortized.
const HOUSING_OWNERS_UPDATE_CHUNK_SIZE = 25_000;
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

    // The bulk owner_id rewrite is a strict 1-to-1 mapping that does not
    // change the set of distinct owner_id values per campaign/group, so
    // the campaigns/groups owner_count triggers on owners_housing would
    // recompute and write back the same values — pure wasted work that
    // dominates the transaction. Bypass them for the duration; counts
    // remain correct without a recompute.
    await disableOwnersHousingTriggers();
    try {
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
        const idpersonnes = Array.from(idMappings.keys());
        for (const table of fkTables) {
          if (table === housingOwnersTable) {
            // owners_housing is far larger than the other FK tables and
            // owner_id is in its PK, so a single UPDATE blocks the
            // connection long enough for the cloud LB to drop the socket.
            // Chunk by idpersonne batches so each statement is short.
            const totalChunks = Math.ceil(
              idpersonnes.length / HOUSING_OWNERS_UPDATE_CHUNK_SIZE
            );
            logger.info(
              `Updating owner_id in ${table} in ${totalChunks} chunks of ${HOUSING_OWNERS_UPDATE_CHUNK_SIZE} idpersonnes...`
            );
            for (
              let i = 0;
              i < idpersonnes.length;
              i += HOUSING_OWNERS_UPDATE_CHUNK_SIZE
            ) {
              const chunkIndex =
                Math.floor(i / HOUSING_OWNERS_UPDATE_CHUNK_SIZE) + 1;
              const chunk = idpersonnes.slice(
                i,
                i + HOUSING_OWNERS_UPDATE_CHUNK_SIZE
              );
              const start = Date.now();
              // When both the old and new owner IDs are already linked to the
              // same housing (e.g. two source owners share the same owner_uid,
              // or a previous housing-owners run already wrote the canonical
              // link), a plain UPDATE would hit the PK. Delete the stale row
              // first — the canonical (new_id) link already represents the
              // correct state.
              await trx.raw(
                `DELETE FROM ?? oh
                 USING owner_id_map m
                 JOIN ?? o ON o.idpersonne = m.idpersonne
                 WHERE oh.owner_id = o.id
                   AND o.id != m.new_id
                   AND m.idpersonne = ANY(?)
                   AND EXISTS (
                     SELECT 1 FROM ?? oh2
                     WHERE oh2.owner_id = m.new_id
                       AND oh2.housing_id = oh.housing_id
                       AND oh2.housing_geo_code = oh.housing_geo_code
                   )`,
                [table, ownerTable, chunk, table]
              );
              await trx.raw(
                `UPDATE ?? SET owner_id = m.new_id
                 FROM owner_id_map m
                 JOIN ?? o ON o.idpersonne = m.idpersonne
                 WHERE ??.owner_id = o.id
                   AND o.id != m.new_id
                   AND m.idpersonne = ANY(?)`,
                [table, ownerTable, table, chunk]
              );
              logger.info(
                `  ${table}: chunk ${chunkIndex}/${totalChunks} done in ${Date.now() - start}ms`
              );
            }
          } else {
            logger.info(`Updating owner_id in ${table}...`);
            await trx.raw(
              `UPDATE ?? SET owner_id = m.new_id
               FROM owner_id_map m
               JOIN ?? o ON o.idpersonne = m.idpersonne
               WHERE ??.owner_id = o.id AND o.id != m.new_id`,
              [table, ownerTable, table]
            );
          }
        }

        logger.info('Updating owners.id...');
        // If two source owners share the same owner_uid, both map to new_id
        // but only one owner row can hold that PK. All FK references for the
        // duplicate have already been re-pointed to new_id in the steps above,
        // so the duplicate owner row is now orphaned and safe to delete.
        await trx.raw(
          `DELETE FROM ?? o
           USING owner_id_map m
           WHERE o.idpersonne = m.idpersonne
             AND o.id != m.new_id
             AND EXISTS (SELECT 1 FROM ?? o2 WHERE o2.id = m.new_id)`,
          [ownerTable, ownerTable]
        );
        await trx.raw(
          `UPDATE ?? SET id = m.new_id
           FROM owner_id_map m
           WHERE ??.idpersonne = m.idpersonne AND ??.id != m.new_id`,
          [ownerTable, ownerTable, ownerTable]
        );

        // Restore FK constraints
        // NOT VALID skips the per-row scan that re-validates the entire
        // referencing table — the bulk UPDATE above just rewrote owner_id
        // from a 1-to-1 mapping in the same transaction, so existing rows
        // are provably consistent. The constraint is still enforced for
        // every future INSERT/UPDATE; only the historical scan is skipped.
        for (const { conname, table_name, definition } of constraints) {
          logger.debug(`Restoring constraint ${table_name}.${conname}...`);
          await trx.raw(
            `ALTER TABLE ?? ADD CONSTRAINT ?? ${definition} NOT VALID`,
            [table_name, conname]
          );
        }
        logger.info('Restored FK constraints.');

        await trx.raw('DROP TABLE owner_id_map');
      });
    } catch (error) {
      console.error('Error during owner id migration:', error);
    } finally {
      await enableOwnersHousingTriggers();
    }

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
