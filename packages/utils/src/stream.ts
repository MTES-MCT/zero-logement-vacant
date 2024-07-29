import { createInterface } from 'node:readline/promises';
import { Readable } from 'node:stream';
import {
  ReadableStream,
  TransformStream,
  WritableStream
} from 'node:stream/web';

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

export function filter<A>(predicate: Predicate<A>): TransformStream<A, A> {
  return new TransformStream({
    async transform(chunk, controller) {
      if (predicate(chunk)) {
        controller.enqueue(chunk);
      }
    }
  });
}
