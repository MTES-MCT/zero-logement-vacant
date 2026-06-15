import { TTLCache } from '@isaacs/ttlcache';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

function toBuffer(chunk: unknown, encoding: BufferEncoding = 'utf8'): Buffer {
  if (chunk === null || chunk === undefined) return Buffer.alloc(0);
  return Buffer.isBuffer(chunk)
    ? chunk
    : Buffer.from(chunk as string, encoding);
}

export function responseCache(ttl: number): RequestHandler {
  const store = new TTLCache<string, Promise<Buffer>>({ ttl });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.originalUrl;
    const hit = store.get(key);

    if (hit !== undefined) {
      hit
        .then((body) =>
          res.set('Content-Type', 'application/json; charset=utf-8').end(body)
        )
        .catch(next);
      return;
    }

    const {
      promise: pending,
      resolve,
      reject
    } = Promise.withResolvers<Buffer>();
    store.set(key, pending);
    pending.catch(() => store.delete(key));

    const originalEnd = res.end.bind(res) as (...args: any[]) => void;
    (res as any).end = (
      chunk?: unknown,
      enc?: BufferEncoding,
      ...rest: any[]
    ) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(toBuffer(chunk, enc));
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
      originalEnd(chunk, enc, ...rest);
    };

    next();
  };
}
