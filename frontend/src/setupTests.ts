// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { enableFetchMocks } from 'jest-fetch-mock';

enableFetchMocks();

jest.mock('./components/Aside/Aside.tsx');

global.URL.createObjectURL = jest.fn();

beforeEach(() => {
  fetchMock.resetMocks();
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
    },
  },
});
