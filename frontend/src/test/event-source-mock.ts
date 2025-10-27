import { EventEmitter } from 'node:events';

export const sources: Map<string, EventEmitter> = new Map();

export class EventSourceMock {
  readonly url: string;

  constructor(url: string) {
    sources.set(url, new EventEmitter());
    this.url = url;
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent<any>) => void
  ): void {
    sources.get(this.url)?.on(type, listener);
  }

  close(): void {
    sources.delete(this.url);
  }
}

export default EventSourceMock;
