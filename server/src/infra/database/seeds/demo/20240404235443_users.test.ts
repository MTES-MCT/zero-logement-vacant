import type { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';

import { establishmentsTable } from '~/repositories/establishmentRepository';
import { USERS_TABLE } from '~/repositories/userRepository';

import {
  SirenSaintLo,
  SirenStrasbourg,
  ZeroLogementVacantEstablishment
} from './20240404235442_establishments';
import { seed } from './20240404235443_users';

interface InsertCall {
  table: string;
  rows: Array<Record<string, unknown>>;
}

describe('demo users seed', () => {
  it('creates matching Better Auth users and credential accounts', async () => {
    const establishments = [
      { id: 'strasbourg-id', siren: SirenStrasbourg, name: 'Strasbourg' },
      { id: 'saint-lo-id', siren: SirenSaintLo, name: 'Saint-Lo' },
      {
        id: 'zlv-id',
        siren: '000000000',
        name: ZeroLogementVacantEstablishment
      }
    ];
    const insertCalls: InsertCall[] = [];
    const where = vi.fn(
      (columnOrCriteria: string | Record<string, unknown>, value?: string) => {
        if (typeof columnOrCriteria === 'object') {
          return Promise.resolve([]);
        }

        const establishment = establishments.find((candidate) => {
          return candidate[columnOrCriteria as 'siren' | 'name'] === value;
        });
        return { first: vi.fn().mockResolvedValue(establishment) };
      }
    );
    const knex = Object.assign(
      vi.fn((table: string) => {
        expect(table).toBe(establishmentsTable);
        return { where };
      }),
      {
        raw: vi.fn().mockResolvedValue(undefined),
        batchInsert: vi.fn(
          (table: string, rows: Array<Record<string, unknown>>) => {
            insertCalls.push({ table, rows });
            return Promise.resolve();
          }
        )
      }
    ) as unknown as Knex;

    await seed(knex);

    const users = insertCalls.find((call) => call.table === USERS_TABLE)?.rows;
    const authUsers = insertCalls.find(
      (call) => call.table === 'auth_users'
    )?.rows;
    const accounts = insertCalls.find((call) => call.table === 'account')?.rows;

    expect(users).toHaveLength(4);
    expect(authUsers).toHaveLength(4);
    expect(accounts).toHaveLength(4);
    expect(authUsers?.map((user) => user.id)).toEqual(
      users?.map((user) => user.id)
    );
    expect(accounts).toEqual(
      users?.map((user) =>
        expect.objectContaining({
          account_id: user.email,
          password: user.password,
          provider_id: 'credential',
          user_id: user.id
        })
      )
    );
  });
});
