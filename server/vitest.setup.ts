import type { Jobs, Queue } from '@zerologementvacant/queue';
import * as extended from 'jest-extended';
import 'jest-sorted';
import { vi } from 'vitest';

// Extend expect with jest-extended matchers
expect.extend(extended);

// Mock mail services
vi.mock('~/services/mailService', () => ({
  default: {
    sendAccountActivationEmail: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmailFromLovac: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock the queue module for vitest
vi.mock('~/infra/queue', () => {
  return {
    default: {
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
    } satisfies Queue
  };
});
