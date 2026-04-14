import { Array as Arr, Option } from 'effect';
import { TransformStream } from 'node:stream/web';

export interface EnrichOptions<S, E> {
  chunkSize?: number;
  fetch(sources: ReadonlyArray<S>): Promise<ReadonlyArray<E>>;
  match(source: S, enrichment: E): boolean;
}

export type Enriched<S, E> = { source: S; existing: E | null };

export function enrichWith<S, E>(
  options: EnrichOptions<S, E>
): TransformStream<S, Enriched<S, E>> {
  const { chunkSize = 500, fetch, match } = options;
  const buffer: S[] = [];

  async function flushBuffer(
    controller: TransformStreamDefaultController<Enriched<S, E>>
  ): Promise<void> {
    if (buffer.length === 0) return;
    const enrichments = await fetch([...buffer]);
    for (const source of buffer) {
      const existing = Option.getOrNull(
        Arr.findFirst(enrichments, (e) => match(source, e))
      );
      controller.enqueue({ source, existing });
    }
    buffer.length = 0;
  }

  return new TransformStream<S, Enriched<S, E>>({
    async transform(source, controller) {
      buffer.push(source);
      if (buffer.length >= chunkSize) {
        await flushBuffer(controller);
      }
    },
    async flush(controller) {
      await flushBuffer(controller);
    }
  });
}
