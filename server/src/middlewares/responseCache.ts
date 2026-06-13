import { TTLCache } from '@isaacs/ttlcache';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function responseCache(ttl: number): RequestHandler {
  const store = new TTLCache<string, Promise<Buffer>>({ ttl });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.originalUrl;
    const hit = store.get(key);

    if (hit !== undefined) {
      hit
        .then((body) => {
          res.set('Content-Type', 'application/json').end(body);
        })
        .catch(next);
      return;
    }

    // Cold cache: intercept res.end to capture the response body.
    let promiseResolve!: (buf: Buffer) => void;
    let promiseReject!: (err: unknown) => void;
    const promise = new Promise<Buffer>((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    store.set(key, promise);
    // Evict on rejection so the next caller retries rather than replaying the error.
    promise.catch(() => store.delete(key));

    const originalEnd = res.end.bind(res);
    (res as any).end = function (chunk?: unknown, ...args: any[]) {
      if (chunk != null) {
        const buf = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as string);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          promiseResolve(buf);
        } else {
          promiseReject(new Error(`HTTP ${res.statusCode}`));
        }
      } else {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          promiseResolve(Buffer.alloc(0));
        } else {
          promiseReject(new Error(`HTTP ${res.statusCode}`));
        }
      }
      return originalEnd(chunk, ...args);
    };

    next();
  };
}
