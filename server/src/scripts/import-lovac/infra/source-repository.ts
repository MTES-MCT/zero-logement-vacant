import { ReadableStream } from 'node:stream/web';

export interface StreamOptions {
  departments?: string[];
}

export interface SourceRepository<A> {
  stream(opts?: StreamOptions): ReadableStream<A>;
}
