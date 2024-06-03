// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'jest-extended';
import { enableFetchMocks } from 'jest-fetch-mock';

import { mockAPI } from './mocks/mock-api';
import EventSourceMock from '../test/event-source-mock';

// @deprecated
enableFetchMocks();

jest.mock('./components/Aside/Aside.tsx');
jest.mock('./components/RichEditor/RichEditor.tsx');

global.URL.createObjectURL = jest.fn();
// @ts-expect-error: global.EventSource is hard to mock
global.EventSource = EventSourceMock as unknown as EventSource;

beforeAll(() => {
  mockAPI.listen({
    // This tells MSW to throw an error whenever it
    // encounters a request that doesn't have a
    // matching request handler.
    onUnhandledRequest: 'error'
  });
});

// @deprecated
beforeEach(() => {
  fetchMock.resetMocks();
});

afterEach(() => {
  mockAPI.resetHandlers();
});

afterAll(() => {
  mockAPI.close();
});

// @ts-expect-error: Property 'dsfr' does not exist on type 'Window & typeof globalThis'.ts(2339)
window.dsfr = (element: HTMLElement) => ({
  modal: {
    disclose() {
      element.setAttribute('aria-modal', 'true');
      element.setAttribute('open', 'true');
    },
    conceal() {
      element.removeAttribute('aria-modal');
      element.removeAttribute('open');
    }
  }
});
