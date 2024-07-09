import { createInterface } from 'node:readline/promises';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

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
