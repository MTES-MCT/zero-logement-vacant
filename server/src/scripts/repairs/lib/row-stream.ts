import { Readable } from 'node:stream';

declare const rowType: unique symbol;

/**
 * A Node object-mode `Readable` known to emit `T`. `Readable` is not generic,
 * so we brand it with a phantom element type: a plain `Readable` is **not**
 * assignable to `RowStream<T>`, which forces every repair to declare what its
 * `query()` stream emits — once, through {@link rows} — and lets `plan` consume
 * it type-safely, tied to the repair's `decide(housing: T)`.
 */
export interface RowStream<T> extends Readable {
  /** Phantom marker — carries the element type, never present at runtime. */
  readonly [rowType]: T;
}

/**
 * Tag a source as a `RowStream<T>`.
 *
 * - A raw Node/Knex stream (`Readable`) is passed through untouched. Knex
 *   `.stream()` is untyped, so this is the single, explicit boundary assertion —
 *   pass the type argument: `rows<HousingApi>(db(...).stream())`.
 * - An in-memory `Iterable` / `AsyncIterable` is wrapped with `Readable.from`,
 *   and its element type is **inferred and checked**: `rows([housing])`.
 */
export function rows<T>(source: Readable): RowStream<T>;
export function rows<T>(source: Iterable<T> | AsyncIterable<T>): RowStream<T>;
export function rows<T>(
  source: Readable | Iterable<T> | AsyncIterable<T>
): RowStream<T> {
  const stream = source instanceof Readable ? source : Readable.from(source);
  return stream as RowStream<T>;
}
