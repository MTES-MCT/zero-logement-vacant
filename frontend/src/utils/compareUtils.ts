export type Refinement<A, B extends A> = (a: A) => a is B;

export const enum Compare {
  A_GT_B = 1,
  A_EQ_B = 0,
  B_GT_A = -1,
}

export type Predicate<A> = (a: A) => boolean;
export const isNull = <A>(a: A | null): a is null => a === null;

export function not<A>(f: Predicate<A>): Predicate<A> {
  return (a) => !f(a);
}

export const isNotNull = <A>(a: A | null): a is A => not(isNull)(a);

export const isDefined = <A>(a: A | undefined): a is A => a !== undefined;
