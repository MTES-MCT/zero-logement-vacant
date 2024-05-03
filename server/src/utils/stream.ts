import highland from 'highland';
import _ from 'lodash';

import { logger } from '~/infra/logger';

type Finder<In = unknown, Out = unknown> = (data: In) => Promise<Out>;
type AwaitedFinders<In, Out, T extends Record<string, Finder<In, Out>>> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

export function appendAll<In, Out, U extends Record<string, Finder<In, Out>>>(
  finders: U,
) {
  return (
    stream: Highland.Stream<In>,
  ): Highland.Stream<In & AwaitedFinders<In, Out, U>> => {
    return stream.flatMap((data) => {
      return highland(
        Promise.all(
          _.toPairs(finders).map(async ([key, finder]) => [
            key,
            await finder(data),
          ]),
        )
          .then(_.fromPairs)
          .then(
            (additionalData) =>
              ({
                ...data,
                ...additionalData,
              }) as In & AwaitedFinders<In, unknown, U>,
          ),
      );
    });
  };
}

export function count(msg: (nb: number) => string) {
  return <T>(stream: Highland.Stream<T>): Highland.Stream<T> => {
    stream
      .observe()
      .reduce(0, (count, items) => {
        return Array.isArray(items) ? count + items.length : count + 1;
      })
      .head()
      .tap((nb) => {
        logger.info(msg(nb));
      });
    return stream;
  };
}

export function errorHandler() {
  return <T>(stream: Highland.Stream<T>): Highland.Stream<T> => {
    const errors: Error[] = [];
    let imported = 0;

    return stream
      .tap((data) => {
        imported += Array.isArray(data) ? data.length : 1;
      })
      .errors((error) => {
        logger.error(error);
        errors.push(error);
      })
      .on('end', () => {
        const report = {
          imported,
          errors: errors.length,
        };
        logger.info('Report', report);
      });
  };
}
