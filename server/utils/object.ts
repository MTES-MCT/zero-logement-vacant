export function keys<A extends Record<string, unknown>>(a: A): Array<keyof A> {
  return Object.keys(a);
}
