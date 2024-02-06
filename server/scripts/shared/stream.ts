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

export function prependAsync<T>(f: (data: T[]) => Promise<T[]>) {
  return (stream: Stream<T[]>): Stream<T[]> => {
    return stream.flatMap((array) =>
      highland(f(array).then((items) => [...items, ...array]))
    );
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
