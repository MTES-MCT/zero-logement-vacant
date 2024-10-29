import 'jest-extended';
import 'jest-sorted';

import type { Jobs, Queue } from '@zerologementvacant/queue';

jest.mock<Queue>('~/infra/queue', () => {
  return {
    add<K extends keyof Jobs>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      job: K,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: Parameters<Jobs[K]>[0]
    ): Promise<void> {
      return Promise.resolve();
    },
    on<K extends keyof Jobs>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      job: K,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      callback: (returned: ReturnType<Jobs[K]>) => void
    ) {
      return;
    },
    close(): Promise<void> {
      return Promise.resolve();
    }
  };
});
