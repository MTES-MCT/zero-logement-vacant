// server/src/middlewares/test/responseCache.test.ts
import express from 'express';
import { constants } from 'http2';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { responseCache } from '../responseCache';

describe('responseCache', () => {
  it('returns the cached response on a cache hit without calling the handler', async () => {
    let calls = 0;
    const app = express();
    app.get('/data', responseCache(60_000), (_req, res) => {
      calls++;
      res.json({ n: calls });
    });

    await request(app).get('/data');
    const { body, status } = await request(app).get('/data');

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(calls).toBe(1);
    expect(body).toEqual({ n: 1 });
  });

  it('re-fetches after TTL expiry', async () => {
    // TTLCache uses performance.now() internally — Vitest fake timers cannot
    // advance it. Use a short real-time TTL with a 5× wait for CI safety.
    let calls = 0;
    const app = express();
    app.get('/data', responseCache(50), (_req, res) => {
      calls++;
      res.json({ n: calls });
    });

    await request(app).get('/data');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await request(app).get('/data');

    expect(calls).toBe(2);
  });

  it('coalesces concurrent cold-cache requests into one handler call', async () => {
    let calls = 0;
    let gateResolve!: () => void;
    const gate = new Promise<void>((resolve) => {
      gateResolve = resolve;
    });

    const app = express();
    app.get('/data', responseCache(60_000), async (_req, res) => {
      calls++;
      await gate;
      res.json({ n: calls });
    });

    // Launch 3 concurrent requests, then yield so they all reach the
    // middleware before the gate opens (all share the same pending Promise).
    const reqs = Promise.all([
      request(app).get('/data'),
      request(app).get('/data'),
      request(app).get('/data'),
    ]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    gateResolve();
    await reqs;

    expect(calls).toBe(1);
  });

  it('evicts a rejected promise so the next caller retries', async () => {
    let calls = 0;
    const app = express();
    app.get('/data', responseCache(60_000), (_req, res, next) => {
      calls++;
      if (calls === 1) {
        next(new Error('boom'));
        return;
      }
      res.json({ ok: true });
    });
    app.use(
      (
        _err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        res
          .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ error: 'boom' });
      }
    );

    await request(app).get('/data'); // first call fails → evicts promise
    const { status } = await request(app).get('/data'); // second call retries

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(calls).toBe(2);
  });
});
