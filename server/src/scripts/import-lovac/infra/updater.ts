import { chunkify } from '@zerologementvacant/utils/node';
import { stringify as writeJSONL } from 'jsonlines';
import fs from 'node:fs';
import { Transform, Writable } from 'node:stream';
import { TransformStream, WritableStream } from 'node:stream/web';
import { match } from 'ts-pattern';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';

const logger = createLogger('updater');

interface FileOptions {
  file: string;
}

function toFile<A>(options: FileOptions): WritableStream<A> {
  const transformer: TransformStream<A, string> = Transform.toWeb(writeJSONL());
  const updater = Writable.toWeb(fs.createWriteStream(options.file, 'utf8'));
  return compose(updater, transformer);
}

export function compose<A, B = A>(
  writer: WritableStream<B>,
  transformer: TransformStream<A, B>
): WritableStream<A> {
  const transformerWritable = transformer.writable.getWriter();

  let pipe: Promise<void>;
  return new WritableStream<A>({
    async start() {
      pipe = transformer.readable.pipeTo(writer);
    },
    async write(chunk: A) {
      await transformerWritable.write(chunk);
    },
    async abort(reason) {
      await transformerWritable.abort(reason);
    },
    async close() {
      await transformerWritable.close();
      await pipe;
    }
  });
}

interface DatabaseOptions<A> {
  temporaryTable: string;
  likeTable: string;
  update(as: ReadonlyArray<A>): Promise<void>;
}

function toDatabase<A>(options: DatabaseOptions<A>): WritableStream<A> {
  const { temporaryTable, likeTable, update } = options;

  const transformer = chunkify<A>({ size: 1_000 });
  const updater = new WritableStream<ReadonlyArray<A>>({
    async start() {
      const tableExists = await db.schema.hasTable(temporaryTable);
      if (tableExists) {
        logger.info(
          `The temporary table "${temporaryTable} exists. Removing...`
        );
        await db.schema.dropTable(temporaryTable);
      }
      logger.info(
        `Creating the temporary table "${temporaryTable}" like "${likeTable}"...`
      );
      await db.schema.createTableLike(temporaryTable, likeTable);
      logger.info(`Created table ${temporaryTable}.`);
    },
    async write(chunk) {
      await db(temporaryTable).insert(chunk);
      await update(chunk);
    },
    async close() {
      const tableExists = await db.schema.hasTable(temporaryTable);
      if (tableExists) {
        logger.info(`Removing the temporary table "${temporaryTable}"...`);
        await db.schema.dropTable(temporaryTable);
        logger.info(`Removed table "${temporaryTable}".`);
      }
    }
  });

  return compose(updater, transformer);
}

export interface UpdaterFileOptions extends FileOptions {
  destination: 'file';
}

export interface UpdaterDatabaseOptions<A> extends DatabaseOptions<A> {
  destination: 'database';
}

export type UpdaterOptions<A> = UpdaterFileOptions | UpdaterDatabaseOptions<A>;

/**
 * Create a bulk updater to write to a file or a postgres database.
 * When used with a database, it will create a temporary table to store the data
 * and then call the `update` function.
 * This approach allows for efficient bulk updates.
 * @param options
 */
export function createUpdater<A>(
  options: UpdaterOptions<A>
): WritableStream<A> {
  return match(options)
    .with({ destination: 'file' }, toFile)
    .with({ destination: 'database' }, toDatabase)
    .exhaustive();
}
