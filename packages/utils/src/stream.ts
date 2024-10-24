import { createInterface } from 'node:readline/promises';
import { Readable } from 'node:stream';
import {
  ReadableStream,
  TransformStream,
  WritableStream
} from 'node:stream/web';
import { Promisable } from 'type-fest';

import { Predicate } from './compare';

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

export function map<A, B>(f: (a: A) => Promisable<B>) {
  return new TransformStream<A, B>({
    async transform(a, controller) {
      controller.enqueue(await f(a));
    }
  });
}

export function tap<A>(f: (a: A, i: number) => Promisable<void>) {
  let i = 0;
  return new TransformStream<A, A>({
    async transform(a, controller) {
      await f(a, i);
      i++;
      controller.enqueue(a);
    }
  });
}

export function reduce<A>(f: (b: A, a: A) => Promisable<A>) {
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
