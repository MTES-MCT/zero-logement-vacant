import { stringify } from 'csv-stringify';
import path from 'node:path';
import fs from 'node:fs/promises';
import { WritableStream } from 'node:stream/web';

import createSourceHousingOwnerFileRepository from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-file-repository';

describe('Source housing owner file repository', () => {
  describe('stream', () => {
    const file = path.join(__dirname, 'source-housings.csv');

    beforeAll(async () => {
      const csv = stringify([
        ['local_id'],
        ['010010000001'],
        ['020040006024'],
        ['820040006106']
      ]);
      await fs.writeFile(file, csv, 'utf8');
    });

    afterAll(async () => {
      await fs.unlink(file);
    });

    it('should filter by departments', async () => {
      const stream = createSourceHousingOwnerFileRepository(file).stream({
        departments: ['01']
      });

      await stream.pipeTo(
        new WritableStream({
          write(chunk) {
            expect(chunk.local_id).toStartWith('01');
          }
        })
      );
    });
  });
});
