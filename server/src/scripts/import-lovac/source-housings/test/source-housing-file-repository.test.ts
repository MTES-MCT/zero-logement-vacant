import { stringify } from 'csv-stringify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WritableStream } from 'node:stream/web';

import createSourceHousingFileRepository from '~/scripts/import-lovac/source-housings/source-housing-file-repository';

describe('Source housing file repository', () => {
  describe('stream', () => {
    const file = path.join(__dirname, 'source-housings.csv');

    beforeAll(async () => {
      const csv = stringify([['geo_code'], ['01234'], ['12345'], ['23456']]);
      await fs.writeFile(file, csv, 'utf8');
    });

    afterAll(async () => {
      await fs.unlink(file);
    });

    it('should filter by departments', async () => {
      const stream = createSourceHousingFileRepository(file).stream({
        departments: ['01']
      });

      await stream.pipeTo(
        new WritableStream({
          write(chunk) {
            expect(chunk.geo_code).toStartWith('01');
          }
        })
      );
    });
  });
});
