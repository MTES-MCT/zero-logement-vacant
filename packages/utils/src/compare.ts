export const enum Comparison {
  A_GT_B = 1,
  A_EQ_B = 0,
  B_GT_A = -1,
}

export type Ord<A> = (first: A, second: A) => Comparison;

export const DEFAULT_ORDER = <A>(first: A, second: A): Comparison =>
  first < second
    ? Comparison.A_GT_B
    : first > second
    ? Comparison.B_GT_A
    : Comparison.A_EQ_B;

export function min<A>(ord: Ord<A> = DEFAULT_ORDER) {
  return (first: A, second: A): A =>
    ord(first, second) === Comparison.B_GT_A ? second : first;
}

export function max<A>(ord: Ord<A> = DEFAULT_ORDER) {
  return (first: A, second: A): A => (ord(first, second) > 0 ? first : second);
}

export function contramap<A, B>(f: (b: B) => A) {
  return (ord: Ord<A>): Ord<B> => {
    return (first, second) => ord(f(first), f(second));
  };
}

export type Predicate<A> = (a: A) => boolean;
export type Refinement<A, B extends A> = (a: A) => a is B;

export const isNull = <A>(a: A | null): a is null => a === null;
export const isUndefined = <A>(a: A | undefined): a is undefined =>
  a === undefined;

export function not<A>(f: Predicate<A>): Predicate<A> {
  return (a) => !f(a);
}

export const isNotNull = <A>(a: A | null): a is A => not(isNull)(a);
export const isDefined = <A>(a: A | undefined): a is A => not(isUndefined)(a);
