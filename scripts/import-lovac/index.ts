import progress from 'cli-progress';
import highland from 'highland';
import _ from 'lodash';

import { HousingApi } from '../../server/models/HousingApi';
import { tapAsync } from '../sync-attio/stream';
import { bulkSave } from './action';
import { compare } from './housing';
import housingRepository from '../../server/repositories/housingRepository';
import { EventApi } from '../../server/models/EventApi';
import db from '../../server/repositories/db';
import { genHousingApi } from '../../server/test/testFixtures';

const BATCH_SIZE = 1000;

function run() {
  const overallProgress = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );
  const saveProgress = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );

  return count().flatMap((total) => {
    overallProgress.start(total, 0);
    saveProgress.start(total, 0);

    return housingRepository
      .stream()
      .tap(() => {
        overallProgress.increment();
      })
      .map((housing) => ({ before: housing }))
      .through(
        appendAll({
          now: () => lovacRepository.findOne(),
          modifications: () => modificationRepository.find(),
        })
      )
      .map(compare)
      .batch(BATCH_SIZE)
      .consume(tapAsync(bulkSave))
      .tap((actions) => {
        saveProgress.update(actions.length);
      })
      .on('end', () => {
        overallProgress.stop();
        saveProgress.stop();
      });
  });
}

type Finder<T> = () => Promise<T>;
type AwaitedFinders<T extends Record<string, Finder<unknown>>> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

export function appendAll<U extends Record<string, Finder<unknown>>>(
  finders: U
) {
  return <T>(
    stream: Highland.Stream<T>
  ): Highland.Stream<T & AwaitedFinders<U>> => {
    return stream.flatMap((data) => {
      return highland(
        Promise.all(
          _.toPairs(finders).map(async ([key, finder]) => [key, await finder()])
        )
          .then(_.fromPairs)
          .then(
            (additionalData) =>
              ({
                ...data,
                ...additionalData,
              } as T & AwaitedFinders<U>)
          )
      );
    });
  };
}

function count(): Highland.Stream<number> {
  return housingRepository.stream().reduce(0, (i) => i + 1);
}

const modificationRepository = {
  async find(): Promise<EventApi[]> {
    return [];
  },
};

const lovacRepository = {
  async findOne(): Promise<HousingApi | null> {
    // TODO
    return genHousingApi();
  },
};

run().done(() => {
  db.destroy();
});
