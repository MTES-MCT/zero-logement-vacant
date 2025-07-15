import { Equivalence, pipe, Record, Struct } from 'effect';

export interface Diff<A> {
  before: Partial<A>;
  after: Partial<A>;
  changed: ReadonlyArray<keyof A>;
}

type Equivalences<A> = {
  [K in keyof A]: Equivalence.Equivalence<A[K]>;
};

export function diff<A extends object>(equivalences: Equivalences<A>) {
  return (before: A, after: A): Diff<A> => {
    const changed = pipe(
      equivalences,
      Record.map((equivalence: Equivalence.Equivalence<any>, key) =>
        equivalence(before[key as keyof A], after[key as keyof A])
      ),
      Record.filter((equals) => !equals),
      Record.keys
    ) as unknown as ReadonlyArray<keyof A>;

    return {
      before: Struct.pick(before, ...changed) as Partial<A>,
      after: Struct.pick(after, ...changed) as Partial<A>,
      changed
    };
  };
}
