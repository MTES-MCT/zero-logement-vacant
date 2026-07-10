import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toUserDBO, type UserDBO } from '~/repositories/userRepository';
import { genUserApi } from '~/test/testFixtures';

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
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  };

  return { db, destroy, logger, select, transaction };
});

vi.mock('~/infra/database', () => ({ default: mocks.db }));
vi.mock('~/infra/logger', () => ({
  createLogger: () => mocks.logger,
  logger: mocks.logger
}));

import { run } from './index';

describe('backfill-auth-users', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('finishes the remaining users, logs the summary, then fails when a row errors', async () => {
    mocks.select.mockResolvedValue([
      toUserDBO({
        ...genUserApi('failing-establishment'),
        id: 'failing-user',
        email: 'failing@example.fr'
      }),
      toUserDBO({
        ...genUserApi('remaining-establishment'),
        id: 'remaining-user',
        email: 'remaining@example.fr'
      })
    ] satisfies UserDBO[]);
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

  it('normalizes mixed-case emails in the auth user and credential account', async () => {
    const user = toUserDBO({
      ...genUserApi('establishment-id'),
      email: 'Mixed.Case@Example.fr'
    });
    const insertedAuthUsers: Array<Record<string, unknown>> = [];
    const insertedAccounts: Array<Record<string, unknown>> = [];
    const transaction = vi.fn((table: string) => {
      if (table === 'auth_users') {
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedAuthUsers.push(row);
            return {
              onConflict: vi.fn(() => ({
                ignore: vi.fn(() => ({
                  returning: vi.fn().mockResolvedValue([{ id: user.id }])
                }))
              }))
            };
          })
        };
      }

      return {
        where: vi.fn(() => ({ first: vi.fn().mockResolvedValue(undefined) })),
        insert: vi.fn((row: Record<string, unknown>) => {
          insertedAccounts.push(row);
          return Promise.resolve();
        })
      };
    });
    mocks.select.mockResolvedValue([user]);
    mocks.transaction.mockImplementation(async (callback) => {
      await callback(transaction);
    });

    await run({ dryRun: false });

    expect(insertedAuthUsers).toEqual([
      expect.objectContaining({ email: 'mixed.case@example.fr' })
    ]);
    expect(insertedAccounts).toEqual([
      expect.objectContaining({ account_id: 'mixed.case@example.fr' })
    ]);
  });

  it('aborts before writing when legacy emails collide after normalization', async () => {
    const firstUser = toUserDBO({
      ...genUserApi('first-establishment-id'),
      email: 'Mixed.Case@Example.fr'
    });
    const secondUser = toUserDBO({
      ...genUserApi('second-establishment-id'),
      email: 'mixed.case@example.fr'
    });
    mocks.select.mockResolvedValue([firstUser, secondUser]);

    await expect(run({ dryRun: false })).rejects.toThrow(
      'Case-insensitive email collisions detected'
    );

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
