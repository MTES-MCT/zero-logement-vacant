import { runInBatches } from '~/infra/database/batch';

describe('runInBatches', () => {
  it('calls fn once per chunk, sequentially, in order', async () => {
    const seen: number[][] = [];
    const calls: Array<{ start: number; end: number }> = [];

    await runInBatches(
      [1, 2, 3, 4, 5],
      async (batch) => {
        const start = performance.now();
        seen.push(batch);
        await new Promise((resolve) => setTimeout(resolve, 5));
        calls.push({ start, end: performance.now() });
      },
      2
    );

    expect(seen).toEqual([[1, 2], [3, 4], [5]]);
    // Sequential: batch N+1 only starts once batch N's promise has resolved.
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].start).toBeGreaterThanOrEqual(calls[i - 1].end);
    }
  });

  it('does not call fn when items is empty', async () => {
    const fn = vi.fn();

    await runInBatches([], fn, 1000);

    expect(fn).not.toHaveBeenCalled();
  });

  it('defaults to a batch size of 1000', async () => {
    const batches: number[][] = [];
    const items = Array.from({ length: 1500 }, (_, i) => i);

    await runInBatches(items, async (batch) => {
      batches.push(batch);
    });

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(1000);
    expect(batches[1]).toHaveLength(500);
  });
});
