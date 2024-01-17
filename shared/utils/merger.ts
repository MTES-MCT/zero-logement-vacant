import fp from 'lodash/fp';
import { contramap, DEFAULT_ORDER, max, min, Ord } from './compare';

type Merger<A> = (first: A, second: A) => A;
type Mergers<T> = {
  [K in keyof T]: Merger<T[K]>;
};

export function merge<T extends object, K extends keyof T = keyof T>(
  strategies: Mergers<T>
) {
  return (first: T, second: T): T => {
    const keys = fp.union(Object.keys(first), Object.keys(second)) as Array<K>;
    return keys.reduce<T>((acc, key) => {
      const strategy: Merger<T[typeof key]> = strategies[key];
      if (strategy) {
        return {
          ...acc,
          [key]: strategy(first[key], second[key]),
        };
      }
      return acc;
    }, {} as T);
  };
}

export const first = <A>(first: A, _: A): A => first;
export const second = <A>(_: A, second: A): A => second;

export const firstDefined = <A>(first: A, second: A): A => first ?? second;

export const byLength: Ord<string> = fp.pipe(
  DEFAULT_ORDER,
  contramap<number, { length: number }>((a) => a.length)
);

export const oldest = min<Date>();
export const youngest = max<Date>();
export const shortest = min(byLength);
export const longest = max(byLength);
