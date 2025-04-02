import { createInterface } from 'node:readline/promises';
import { Readable } from 'node:stream';
import {
  ReadableStream,
  TransformStream,
  WritableStream
} from 'node:stream/web';
import { AsyncOrSync } from 'ts-essentials';

import { Predicate } from './compare';

interface ChunkifyOptions {
  /**
   * @default 1000
   */
  size?: number;
}

export function chunkify<A>(options?: ChunkifyOptions) {
  const size = options?.size ?? 1000;
  const chunk: A[] = [];

  return new TransformStream<A, ReadonlyArray<A>>({
    async transform(a, controller) {
      chunk.push(a);

      if (chunk.length >= size) {
        controller.enqueue([...chunk]);
        chunk.length = 0;
      }
    },
    flush(controller) {
      if (chunk.length > 0) {
        controller.enqueue([...chunk]);
      }
    }
  });
}

export async function countLines(file: ReadableStream): Promise<number> {
  return new Promise((resolve) => {
    let lines = 0;

    createInterface({
      input: Readable.fromWeb(file)
    })
      .on('line', () => {
        lines++;
      })
      .on('close', () => {
        resolve(lines);
      });
  });
}

export async function count<A>(stream: ReadableStream<A>): Promise<number> {
  return new Promise((resolve) => {
    let i = 0;

    stream.pipeTo(
      new WritableStream<A>({
        write() {
          i++;
        },
        close() {
          resolve(i);
        }
      })
    );
  });
}

export function map<A, B>(f: (a: A) => AsyncOrSync<B>) {
  return new TransformStream<A, B>({
    async transform(a, controller) {
      controller.enqueue(await f(a));
    }
  });
}

export function tap<A>(f: (a: A, i: number) => AsyncOrSync<void>) {
  let i = 0;
  return new TransformStream<A, A>({
    async transform(a, controller) {
      await f(a, i);
      i++;
      controller.enqueue(a);
    }
  });
}

export function reduce<A>(f: (b: A, a: A) => AsyncOrSync<A>) {
  let b: A;

  return new TransformStream<A, A>({
    async transform(a) {
      if (!b) {
        b = a;
        return;
      }

      b = await f(b, a);
    },
    flush(controller) {
      controller.enqueue(b);
    }
  });
}

export function filter<A>(predicate: Predicate<A>): TransformStream<A, A> {
  return new TransformStream({
    async transform(a, controller) {
      if (predicate(a)) {
        controller.enqueue(a);
      }
    }
  });
}
