import { stringify } from 'csv-stringify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WritableStream } from 'node:stream/web';

import createSourceBuildingFileRepository from '~/scripts/import-lovac/source-buildings/source-building-file-repository';

describe('Source building file repository', () => {
  describe('stream', () => {
    const file = path.join(__dirname, 'source-buildings.csv');

    beforeAll(async () => {
      const csv = stringify([
        ['building_id'],
        ['93007000AV0719A'],
        ['33056000BR0008C'],
        ['63113000IN0040A']
      ]);
      await fs.writeFile(file, csv, 'utf8');
    });

    afterAll(async () => {
      await fs.unlink(file);
    });

    it('should filter by departments', async () => {
      const stream = createSourceBuildingFileRepository(file).stream({
        departments: ['01']
      });

      await stream.pipeTo(
        new WritableStream({
          write(chunk) {
            expect(chunk.building_id).toStartWith('01');
          }
        })
      );
    });
  });
});
