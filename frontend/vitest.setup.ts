import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import * as extended from 'jest-extended';
import 'jest-sorted';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import data from './src/mocks/handlers/data';
import { mockAPI } from './src/mocks/mock-api';
import EventSourceMock from './src/test/event-source-mock';

// Heavy view tests (full Redux store + MSW + DSFR) can take well over the
// default 1s `findBy*` timeout just to mount on heavily-loaded CI runners
// (observed suites running ~15x slower than locally), causing flaky
// "Unable to find role" failures. Give async queries far more headroom; this
// only raises the ceiling, fast queries still resolve immediately.
configure({ asyncUtilTimeout: 10_000 });

expect.extend(extended);
// expect.extend(sorted);

global.URL.createObjectURL = vi.fn();
// @ts-expect-error: global.EventSource is hard to mock
global.EventSource = EventSourceMock as unknown as EventSource;

vi.mock('./src/components/RichEditor/RichEditor.tsx');
vi.mock('./src/components/Map/Map.tsx');

beforeAll(() => {
  mockAPI.listen({
    // This tells MSW to throw an error whenever it
    // encounters a request that doesn't have a
    // matching request handler.
    onUnhandledRequest: 'error'
  });
});

afterEach(() => {
  mockAPI.resetHandlers();
  data.reset();
});

afterAll(() => {
  mockAPI.close();
});

// @ts-expect-error: Property 'dsfr' does not exist on type 'Window & typeof globalThis'.ts(2339)
window.dsfr = (element: HTMLElement | null) => ({
  modal: {
    disclose() {
      element?.setAttribute('aria-modal', 'true');
      element?.setAttribute('open', 'true');
    },
    conceal() {
      element?.removeAttribute('aria-modal');
      element?.removeAttribute('open');
    }
  }
});
