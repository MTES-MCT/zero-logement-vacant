import { beforeEach, describe, expect, it, vi } from 'vitest';

import { genUserApi } from '~/test/testFixtures';

const mocks = vi.hoisted(() => {
  const transaction = vi.fn();
  const db = Object.assign(vi.fn(), { transaction });

  return { db, transaction };
});

vi.mock('~/infra/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/infra/database')>();
  return { ...actual, default: mocks.db };
});

import { syncAuthTables, updateUserAndAuth } from './authUserSyncService';

describe('syncAuthTables', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('normalizes the auth user and credential account emails', async () => {
    const user = {
      ...genUserApi('establishment-id'),
      email: 'Mixed.Case@Example.fr'
    };
    const insertedAuthUsers: Array<Record<string, unknown>> = [];
    const insertedAccounts: Array<Record<string, unknown>> = [];
    const transaction = vi.fn((table: string) => {
      if (table === 'auth_users') {
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedAuthUsers.push(row);
            return {
              onConflict: vi.fn(() => ({
                merge: vi.fn().mockResolvedValue(undefined)
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
    mocks.transaction.mockImplementation(async (callback) => {
      await callback(transaction);
    });

    await syncAuthTables(user);

    expect(insertedAuthUsers).toEqual([
      expect.objectContaining({ email: 'mixed.case@example.fr' })
    ]);
    expect(insertedAccounts).toEqual([
      expect.objectContaining({ account_id: 'mixed.case@example.fr' })
    ]);
  });

  it('normalizes an existing credential account when its password changes', async () => {
    const user = {
      ...genUserApi('establishment-id'),
      email: 'Mixed.Case@Example.fr'
    };
    const accountUpdates: Array<Record<string, unknown>> = [];
    const transaction = vi.fn((table: string) => {
      if (table === 'users') {
        return {
          where: vi.fn(() => ({ update: vi.fn().mockResolvedValue(undefined) }))
        };
      }
      if (table === 'auth_users') {
        return {
          insert: vi.fn(() => ({
            onConflict: vi.fn(() => ({
              merge: vi.fn().mockResolvedValue(undefined)
            }))
          }))
        };
      }

      return {
        where: vi.fn((criteria: Record<string, unknown>) => ({
          first: vi
            .fn()
            .mockResolvedValue(
              'provider_id' in criteria ? { id: 'account-id' } : undefined
            ),
          update: vi.fn((row: Record<string, unknown>) => {
            accountUpdates.push(row);
            return Promise.resolve();
          })
        }))
      };
    });
    mocks.transaction.mockImplementation(async (callback) => {
      await callback(transaction);
    });

    await updateUserAndAuth(user, { passwordChanged: true });

    expect(accountUpdates).toEqual([
      expect.objectContaining({ account_id: 'mixed.case@example.fr' })
    ]);
  });
});
