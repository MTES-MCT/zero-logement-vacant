import highland from 'highland';
import _ from 'lodash';
import notion from './notion';

type Finder<In = unknown, Out = unknown> = (data: In) => Promise<Out>;
type AwaitedFinders<In, Out, T extends Record<string, Finder<In, Out>>> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

export function appendAll<In, Out, U extends Record<string, Finder<In, Out>>>(
  finders: U
) {
  return (
    stream: Highland.Stream<In>
  ): Highland.Stream<In & AwaitedFinders<In, Out, U>> => {
    return stream.flatMap((data) => {
      return highland(
        Promise.all(
          _.toPairs(finders).map(async ([key, finder]) => [
            key,
            await finder(data),
          ])
        )
          .then(_.fromPairs)
          .then(
            (additionalData) =>
              ({
                ...data,
                ...additionalData,
              } as In & AwaitedFinders<In, unknown, U>)
          )
      );
    });
  };
}

export function count() {
  return (stream: Highland.Stream<any>): Highland.Stream<number> => {
    return stream.reduce(0, (i) => i + 1);
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
        errors.push(error);
      })
      .on('end', () => {
        const report = {
          imported,
          errors,
        };
        notion.publish(report);
      });
  };
}
