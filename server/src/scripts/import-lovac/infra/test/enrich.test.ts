import { ReadableStream, WritableStream } from 'node:stream/web';
import { describe, expect, it, vi } from 'vitest';
import { enrichWith } from '~/scripts/import-lovac/infra/enrich';

describe('enrichWith', () => {
  it('should pair each source item with its matching enrichment', async () => {
    const sources = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const db = [
      { id: 'a', name: 'Alice' },
      { id: 'c', name: 'Carol' }
    ];
    const result: { source: { id: string }; existing: { id: string; name: string } | null }[] = [];

    await new ReadableStream({
      pull(controller) {
        for (const s of sources) controller.enqueue(s);
        controller.close();
      }
    })
      .pipeThrough(
        enrichWith({
          fetch: async (chunk) => db.filter((e) => chunk.some((s) => s.id === e.id)),
          match: (source, enrichment) => source.id === enrichment.id
        })
      )
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ source: { id: 'a' }, existing: { id: 'a', name: 'Alice' } });
    expect(result[1]).toEqual({ source: { id: 'b' }, existing: null });
    expect(result[2]).toEqual({ source: { id: 'c' }, existing: { id: 'c', name: 'Carol' } });
  });

  it('should call fetch once per full chunk', async () => {
    const sources = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const fetch = vi.fn().mockResolvedValue([]);

    await new ReadableStream({
      pull(controller) {
        for (const s of sources) controller.enqueue(s);
        controller.close();
      }
    })
      .pipeThrough(enrichWith({ chunkSize: 3, fetch, match: () => false }))
      .pipeTo(new WritableStream({ write() {} }));

    // 10 items / chunkSize 3 → ceil(10/3) = 4 calls
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('should flush remaining items on stream close', async () => {
    const fetch = vi.fn().mockResolvedValue([]);
    const result: unknown[] = [];

    await new ReadableStream({
      pull(controller) {
        controller.enqueue({ id: '1' }); // below default chunkSize
        controller.close();
      }
    })
      .pipeThrough(enrichWith({ fetch, match: () => false }))
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
