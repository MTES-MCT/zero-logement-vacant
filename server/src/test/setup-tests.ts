/* eslint-disable @typescript-eslint/no-unused-vars */
import { enableFetchMocks } from 'jest-fetch-mock';
import 'jest-extended';
import 'jest-sorted';

import type { Jobs, Queue } from '@zerologementvacant/queue';

enableFetchMocks();

jest.mock<Queue>('~/infra/queue', () => {
  return {
    add<K extends keyof Jobs>(
      job: K,
      data: Parameters<Jobs[K]>[0]
    ): Promise<void> {
      return Promise.resolve();
    },
    on<K extends keyof Jobs>(
      job: K,
      callback: (returned: ReturnType<Jobs[K]>) => void
    ) {
      return;
    },
    close(): Promise<void> {
      return Promise.resolve();
    },
  };
});

global.beforeEach(() => {
  fetchMock.resetMocks();
});
