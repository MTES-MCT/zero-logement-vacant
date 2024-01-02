import fp from 'lodash/fp';

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
