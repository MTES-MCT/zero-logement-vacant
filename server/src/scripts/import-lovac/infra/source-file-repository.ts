import { parse as parseJSONL } from '@jsonlines/core';
import { parse as parseCSV } from 'csv-parse';
import fs from 'node:fs';
import path from 'node:path';
import { Duplex, Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import { SourceRepository } from '~/scripts/import-lovac/infra/source-repository';
import { createLogger } from '~/infra/logger';

const ALLOWED_EXTENSIONS = ['.csv', '.jsonl'] as const;
type Extension = (typeof ALLOWED_EXTENSIONS)[number];

const DATE_REGEXP = /^\d{4}-\d{2}-\d{2} 00:00:00$/;

function isAllowedExtension(extension: string): extension is Extension {
  return ALLOWED_EXTENSIONS.includes(extension as Extension);
}

const logger = createLogger('sourceFileRepository');

export abstract class SourceFileRepository<A> implements SourceRepository<A> {
  protected abstract columns: string[];

  protected constructor(protected file: string) {}

  stream(): ReadableStream<A> {
    const extension = path.extname(this.file);
    if (!extension.length || !isAllowedExtension(extension)) {
      throw new Error('Bad file extension');
    }

    const parsers: Record<Extension, () => Duplex> = {
      '.csv': () =>
        parseCSV({
          cast(value) {
            if (value === 'null') {
              return null;
            }

            if (DATE_REGEXP.test(value)) {
              return new Date(value.substring(0, 'yyyy-mm-dd'.length));
            }

            return value;
          },
          columns: this.columns
        }),
      '.jsonl': () => parseJSONL()
    };
    const parser = parsers[extension];

    logger.debug(`Loading ${this.file}...`);
    return Readable.toWeb(fs.createReadStream(this.file).pipe(parser()));
  }
}