import { ReadableStream } from 'node:stream/web';
import {
  chunkify,
  countLines,
  filter,
  groupBy,
  map,
  reduce,
  tap
} from '../stream';

describe('Stream', () => {
  async function collect<A>(
    stream: ReadableStream<A>
  ): Promise<ReadonlyArray<A>> {
    const as: A[] = [];
    await stream.pipeTo(
      new WritableStream({
        write(a: A) {
          as.push(a);
        }
      })
    );
    return as;
  }

  describe('groupBy', () => {
    it('should group items using an equality function', async () => {
      const items = [1, 1, 2, 2, 3];
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const actual = await collect(
        stream.pipeThrough(groupBy((a, b) => a === b))
      );

      expect(actual).toStrictEqual([[1, 1], [2, 2], [3]]);
    });
  });

  describe('chunkify', () => {
    it('should perfectly split an array in chunks of n', async () => {
      const items = [1, 2, 3, 4];
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const actual = await collect(stream.pipeThrough(chunkify({ size: 2 })));

      expect(actual).toStrictEqual([
        [1, 2],
        [3, 4]
      ]);
    });

    it('should fill the last part of the array', async () => {
      const items = [1, 2, 3];
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const actual = await collect(stream.pipeThrough(chunkify({ size: 2 })));

      expect(actual).toStrictEqual([[1, 2], [3]]);
    });
  });

  describe('countLines', () => {
    it('should count lines', async () => {
      const stream = new ReadableStream({
        pull(controller) {
          controller.enqueue('line 1\n');
          controller.enqueue('line 2\n');
          controller.enqueue('line 3\n');
          controller.close();
        }
      });

      const actual = await countLines(stream);

      expect(actual).toBe(3);
    });
  });

  describe('map', () => {
    it('should map a value', async () => {
      const items = [1, 2, 3];
      const f = (n: number) => n * 2;
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const mapped = stream.pipeThrough(map(f));

      const actual = await collect(mapped);
      expect(actual).toStrictEqual([2, 4, 6]);
    });
  });

  describe('tap', () => {
    it('should call the given function', async () => {
      const items = [1, 2, 3];
      const f = jest.fn();
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const actual = await collect(stream.pipeThrough(tap(f)));

      expect(actual).toStrictEqual([1, 2, 3]);
      expect(f).toHaveBeenCalledTimes(items.length);
    });
  });

  describe('reduce', () => {
    it('should reduce to a single value', async () => {
      const items = [1, 2, 3];
      const f = (a: number, b: number) => a + b;
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const [actual] = await collect(stream.pipeThrough(reduce(f)));

      expect(actual).toBe(6);
    });
  });

  describe('filter', () => {
    it('should filter items based on a predicate', async () => {
      const items = [1, 2, 3];
      const f = (n: number) => n % 2 !== 0;
      const stream = new ReadableStream<number>({
        start(controller) {
          items.forEach((item) => {
            controller.enqueue(item);
          });
          controller.close();
        }
      });

      const actual = await collect(stream.pipeThrough(filter(f)));

      expect(actual).toStrictEqual([1, 3]);
    });
  });
});
