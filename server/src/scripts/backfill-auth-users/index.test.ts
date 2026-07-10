import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserDBO } from '~/repositories/userRepository';

const mocks = vi.hoisted(() => {
  const select = vi.fn();
  const transaction = vi.fn();
  const destroy = vi.fn();
  const db = Object.assign(
    vi.fn(() => ({ select })),
    {
      transaction,
      destroy
    }
  );
  const logger = {
    info: vi.fn(),
    error: vi.fn()
  };

  return { db, destroy, logger, select, transaction };
});

vi.mock('~/infra/database', () => ({ default: mocks.db }));
vi.mock('~/infra/logger', () => ({
  createLogger: () => mocks.logger
}));

import { run } from './index';

describe('backfill-auth-users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finishes the remaining users, logs the summary, then fails when a row errors', async () => {
    mocks.select.mockResolvedValue([
      { id: 'failing-user' },
      { id: 'remaining-user' }
    ] as UserDBO[]);
    mocks.transaction
      .mockRejectedValueOnce(new Error('invalid auth user'))
      .mockResolvedValueOnce(undefined);

    await expect(run({ dryRun: false })).rejects.toThrow(
      'Backfill completed with 1 error(s)'
    );

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.logger.info).toHaveBeenLastCalledWith(
      'Backfill complete',
      expect.objectContaining({ errored: 1 })
    );
  });
});
