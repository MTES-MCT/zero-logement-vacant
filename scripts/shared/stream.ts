import highland from 'highland';
import { logger } from '../../server/utils/logger';
import Stream = Highland.Stream;

export function tapAsync<T>(f: (data: T) => Promise<void>) {
  return (
    error: Error | null,
    data: T | Highland.Nil,
    push: (err: Error | null, value?: T | Highland.Nil) => void,
    next: () => void
  ): void => {
    if (error) {
      push(error);
      next();
      return;
    }

    if (highland.isNil(data)) {
      push(null, highland.nil);
      return;
    }

    f(data)
      .then(() => {
        push(null, data);
      })
      .catch((error) => {
        push(error);
      })
      .finally(next);
  };
}

export function tapAllAsync<T>(f: (data: T) => Promise<T>) {
  return (
    error: Error | null,
    array: T[] | Highland.Nil,
    push: (err: Error | null, value?: T[] | Highland.Nil) => void,
    next: () => void
  ): void => {
    if (error) {
      push(error);
      next();
      return;
    }

    if (highland.isNil(array)) {
      push(null, highland.nil);
      return;
    }

    Promise.allSettled(array.map(f))
      .then((promises) => {
        const values: T[] = promises
          .filter(
            (promise): promise is PromiseFulfilledResult<Awaited<T>> =>
              promise.status === 'fulfilled'
          )
          .map((promise) => promise.value);
        push(null, values);

        promises
          .filter(
            (promise): promise is PromiseRejectedResult =>
              promise.status === 'rejected'
          )
          .map((promise) => promise.reason)
          .forEach((reason) => {
            if (reason instanceof Error) {
              push(reason);
            } else if (typeof reason === 'string') {
              push(new Error(reason));
            } else {
              push(new Error());
            }
          });
      })
      .finally(next);
  };
}

export function counter(message: (count: number) => string) {
  let count = 0;

  return <T>(stream: Stream<T>): Stream<T> => {
    return stream
      .tap(() => {
        count++;
      })
      .on('end', () => {
        logger.info(message(count));
      });
  };
}
