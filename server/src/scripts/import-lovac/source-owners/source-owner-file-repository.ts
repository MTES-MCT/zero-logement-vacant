import { parse as parseJSONL } from '@jsonlines/core';
import { parse as parseCSV } from 'csv-parse';
import fs from 'node:fs';
import path from 'node:path';
import { Duplex, Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import { SourceRepository } from '~/scripts/import-lovac/infra/source-repository';
import { SourceOwner } from '~/scripts/import-lovac/source-owners/source-owner';
import { createLogger } from '~/infra/logger';

const ALLOWED_EXTENSIONS = ['.csv', '.jsonl'] as const;
type Extension = (typeof ALLOWED_EXTENSIONS)[number];

const DATE_REGEXP = /^\d{4}-\d{2}-\d{2} 00:00:00$/;

function isAllowedExtension(extension: string): extension is Extension {
  return ALLOWED_EXTENSIONS.includes(extension as Extension);
}

const logger = createLogger('sourceOwnerRepository');

class SourceOwnerFileRepository implements SourceRepository<SourceOwner> {
  constructor(private file: string) {}

  stream(): ReadableStream<SourceOwner> {
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
          columns: [
            'id',
            'idpersonne',
            'Administrator',
            'full_name',
            'birth_date',
            'raw_address',
            'Additional Address',
            'kind'
          ]
        }),
      '.jsonl': () => parseJSONL()
    };
    const parser = parsers[extension];

    logger.debug(`Loading ${this.file}...`);
    return Readable.toWeb(fs.createReadStream(this.file).pipe(parser()));
  }
}

function createSourceOwnerFileRepository(
  file: string
): SourceRepository<SourceOwner> {
  return new SourceOwnerFileRepository(file);
}

export default createSourceOwnerFileRepository;
