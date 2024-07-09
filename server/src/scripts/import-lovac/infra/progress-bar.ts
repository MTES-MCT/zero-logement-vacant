import { SingleBar } from 'cli-progress';
import { TransformStream } from 'node:stream/web';

interface ProgressOptions {
  initial: number;
  total: number;
}

export function progress(opts: ProgressOptions) {
  const bar = new SingleBar({ etaBuffer: 10_000 });

  return new TransformStream({
    start() {
      bar.start(opts.total, opts.initial);
    },
    transform(chunk, controller) {
      bar.increment();
      controller.enqueue(chunk);
    },
    flush(controller) {
      bar.stop();
      controller.terminate();
    }
  });
}
