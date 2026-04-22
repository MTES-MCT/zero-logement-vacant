import { MultiBar, SingleBar } from 'cli-progress';
import { TransformStream } from 'node:stream/web';

interface ProgressOptions {
  initial: number;
  total: number;
  name?: string;
}

export function progress(opts: ProgressOptions) {
  const name = opts.name ?? 'progress';
  const bar = new SingleBar({
    format: `${name} [{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total}`,
    etaBuffer: 10_000,
    fps: 5,
    etaAsynchronousUpdate: true,
    stopOnComplete: true,
    clearOnComplete: false
  });

  return new TransformStream({
    start() {
      bar.start(opts.total, opts.initial);
    },
    transform(chunk, controller) {
      bar.increment(Array.isArray(chunk) ? chunk.length : 1);
      controller.enqueue(chunk);
    },
    flush() {
      bar.stop();
    }
  });
}

const MULTI_BAR_FORMAT =
  'dept {dept} [{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total}';

export function createMultiBar(): MultiBar {
  return new MultiBar({
    format: MULTI_BAR_FORMAT,
    etaBuffer: 10_000,
    fps: 5,
    etaAsynchronousUpdate: true,
    stopOnComplete: true,
    clearOnComplete: false,
    hideCursor: true
  });
}

interface MultiProgressOptions {
  multiBar: MultiBar;
  dept: string;
  total: number;
}

export function multiProgress(opts: MultiProgressOptions) {
  const bar = opts.multiBar.create(opts.total, 0, { dept: opts.dept });

  return new TransformStream({
    transform(chunk, controller) {
      bar.increment(Array.isArray(chunk) ? chunk.length : 1);
      controller.enqueue(chunk);
    },
    flush() {
      bar.stop();
    }
  });
}
