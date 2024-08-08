import { ReadableStream } from 'node:stream/web';
import { countLines } from '../stream';

describe('Stream', () => {
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
});
