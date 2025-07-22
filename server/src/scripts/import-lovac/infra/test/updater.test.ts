import { vi } from 'vitest';
import { faker } from '@faker-js/faker/locale/fr';
import { OCCUPANCY_VALUES } from '@zerologementvacant/models';
import { map, toArray } from '@zerologementvacant/utils/node';
import { parse as parseJSONL } from 'jsonlines';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import db from '~/infra/database';

import { HousingApi } from '~/models/HousingApi';
import {
  formatHousingRecordApi,
  Housing,
  HousingDBO,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { genHousingApi } from '~/test/testFixtures';

import { compose, createUpdater } from '../updater';

describe('Updater', () => {
  it('should write to a file', async () => {
    const file = path.join(import.meta.dirname, 'housing-updates.jsonl');
    const items = Array.from({ length: 3 }, () => ({
      id: faker.string.uuid()
    }));
    const stream = new ReadableStream({
      start(controller) {
        items.forEach((item) => {
          controller.enqueue(item);
        });
        controller.close();
      }
    });

    await stream.pipeTo(
      createUpdater({
        destination: 'file',
        file: file
      })
    );

    const reader = Readable.toWeb(fs.createReadStream(file, 'utf8'));
    const parser = Transform.toWeb(parseJSONL());
    const actual = await toArray(reader.pipeThrough(parser));
    expect(actual).toStrictEqual(items);
  });

  it('should write to a database', async () => {
    const temporaryTable = 'tmp';
    const housingsBefore: ReadonlyArray<HousingApi> = Array.from(
      { length: 3 },
      () => genHousingApi()
    );
    await Housing().insert(housingsBefore.map(formatHousingRecordApi));
    const housingsAfter = housingsBefore.map<HousingApi>((housing) => ({
      ...housing,
      occupancy: faker.helpers.arrayElement(
        OCCUPANCY_VALUES.filter(
          // Change each housing’s occupancy
          (occupancy) => occupancy !== housing.occupancy
        )
      )
    }));
    const stream = new ReadableStream<HousingApi>({
      async start(controller) {
        housingsAfter.forEach((housing) => {
          controller.enqueue(housing);
        });
        controller.close();
      }
    }).pipeThrough(map(formatHousingRecordApi));

    const updater = createUpdater({
      destination: 'database',
      temporaryTable: temporaryTable,
      likeTable: housingTable,
      async update(housings: ReadonlyArray<HousingRecordDBO>): Promise<void> {
        await Housing()
          .updateFrom(temporaryTable)
          .update({
            status: db.ref(`${temporaryTable}.status`)
          })
          .where(
            `${housingTable}.geo_code`,
            db.ref(`${temporaryTable}.geo_code`)
          )
          .where(`${housingTable}.id`, db.ref(`${temporaryTable}.id`))
          .whereIn(
            [`${temporaryTable}.geo_code`, `${temporaryTable}.id`],
            housings.map((housing) => [housing.geo_code, housing.id])
          );
      }
    });
    await stream.pipeTo(updater);

    const actual = await Housing().whereIn(
      ['geo_code', 'id'],
      housingsBefore.map((housing) => [housing.geoCode, housing.id])
    );
    housingsAfter.forEach((housing) => {
      expect(actual).toPartiallyContain<Partial<HousingDBO>>({
        geo_code: housing.geoCode,
        id: housing.id,
        status: housing.status
      });
    });
  });

  describe('compose', () => {
    it('should compose a TransformStream with a WritableStream', async () => {
      const fn = vi.fn();
      const actual: string[] = [];

      const stringifier = Transform.toWeb(
        new Transform({
          objectMode: true,
          transform(chunk: number, _encoding, callback) {
            callback(null, String(chunk));
          }
        })
      );

      const multipler = Transform.toWeb(
        new Transform({
          objectMode: true,
          transform(chunk: number, _encoding, callback) {
            callback(null, chunk * 2);
          }
        })
      );

      const writer = new WritableStream<string>({
        async write(chunk) {
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              actual.push(chunk);
              fn();
              resolve();
            }, 100);
          });
        }
      });
      const items = [1, 2, 3];
      const reader = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      await reader.pipeTo(compose(compose(writer, stringifier), multipler));

      expect(actual).toStrictEqual(['2', '4', '6']);
      expect(fn).toHaveBeenCalledTimes(items.length);
    });
  });
});
