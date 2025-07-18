/**
 * @note The block below contains polyfills for Node.js globals
 * required for Jest to function when running JSDOM tests.
 * These HAVE to be require's and HAVE to be in this exact
 * order, since "undici" depends on the "TextEncoder" global API.
 *
 * Consider migrating to a more modern test runner if
 * you don't want to deal with this.
 */

globalThis.setImmediate  ??= (fn, ...args) => setTimeout(fn, 0, ...args);
globalThis.clearImmediate ??= (id) => clearTimeout(id);

if (!('markResourceTiming' in performance)) {
  performance.markResourceTiming = () => {};          // no‑op
}

const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, TransformStream } = require('node:stream/web');
const { BroadcastChannel } = require('node:worker_threads')

Object.defineProperties(globalThis, {
  ReadableStream: { value: ReadableStream },
  TransformStream: { value: TransformStream },
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder }
});

const { Blob, File } = require('node:buffer');
const { fetch, Headers, FormData, Request, Response } = require('undici');

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true, configurable: true },
  Blob: { value: Blob },
  File: { value: File },
  Headers: { value: Headers },
  FormData: { value: FormData },
  Request: { value: Request, configurable: true },
  Response: { value: Response, configurable: true },
  BroadcastChannel: { value: BroadcastChannel },
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  })
});
