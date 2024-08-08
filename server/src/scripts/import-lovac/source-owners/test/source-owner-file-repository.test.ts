import { stringify } from 'csv-stringify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WritableStream } from 'node:stream/web';

import createSourceOwnerFileRepository from '~/scripts/import-lovac/source-owners/source-owner-file-repository';

describe('Source owner file repository', () => {
  describe('stream', () => {
    const file = path.join(__dirname, 'source-owners.csv');

    beforeAll(async () => {
      const csv = stringify([
        ['idpersonne'],
        ['01234567890'],
        ['01234567891'],
        ['02345678901'],
        ['98765432101']
      ]);
      await fs.writeFile(file, csv, 'utf8');
    });

    it('should filter by departments', async () => {
      const stream = createSourceOwnerFileRepository(file).stream({
        departments: ['01']
      });

      await stream.pipeTo(
        new WritableStream({
          write(chunk) {
            expect(chunk.idpersonne).toStartWith('01');
          }
        })
      );
    });

    afterAll(async () => {
      await fs.unlink(file);
    });
  });
});
