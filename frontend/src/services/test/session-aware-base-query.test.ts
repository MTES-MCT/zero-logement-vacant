import type { BaseQueryApi, fetchBaseQuery } from '@reduxjs/toolkit/query';
import { vi } from 'vitest';

import { createSessionAwareBaseQuery } from '../session-aware-base-query';

type FetchBaseQuery = ReturnType<typeof fetchBaseQuery>;

const api = {} as BaseQueryApi;

describe('createSessionAwareBaseQuery', () => {
  it('signs out when a 401 confirms that the session has expired', async () => {
    const unauthorized = { error: { status: 401, data: null } };
    const baseQuery = vi
      .fn()
      .mockResolvedValue(unauthorized) as unknown as FetchBaseQuery;
    const sessionClient = {
      getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    const query = createSessionAwareBaseQuery(baseQuery, sessionClient);

    await expect(query('/protected', api, {})).resolves.toEqual(unauthorized);

    expect(sessionClient.getSession).toHaveBeenCalledOnce();
    expect(sessionClient.signOut).toHaveBeenCalledOnce();
  });

  it('keeps a valid session when a business endpoint returns 401', async () => {
    const baseQuery = vi.fn().mockResolvedValue({
      error: { status: 401, data: null }
    }) as unknown as FetchBaseQuery;
    const sessionClient = {
      getSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    const query = createSessionAwareBaseQuery(baseQuery, sessionClient);

    await query('/business-rule', api, {});

    expect(sessionClient.signOut).not.toHaveBeenCalled();
  });

  it('preserves the original 401 when session revalidation fails', async () => {
    const unauthorized = { error: { status: 401, data: null } };
    const baseQuery = vi
      .fn()
      .mockResolvedValue(unauthorized) as unknown as FetchBaseQuery;
    const sessionClient = {
      getSession: vi.fn().mockRejectedValue(new Error('Network error')),
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    const query = createSessionAwareBaseQuery(baseQuery, sessionClient);

    await expect(query('/protected', api, {})).resolves.toEqual(unauthorized);
    expect(sessionClient.signOut).not.toHaveBeenCalled();
  });

  it('checks the session only once for concurrent 401 responses', async () => {
    let resolveSession!: (value: { data: null; error: null }) => void;
    const baseQuery = vi.fn().mockResolvedValue({
      error: { status: 401, data: null }
    }) as unknown as FetchBaseQuery;
    const sessionClient = {
      getSession: vi.fn(
        () =>
          new Promise<{ data: null; error: null }>((resolve) => {
            resolveSession = resolve;
          })
      ),
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    const query = createSessionAwareBaseQuery(baseQuery, sessionClient);

    const first = query('/first', api, {});
    const second = query('/second', api, {});
    await vi.waitFor(() => expect(sessionClient.getSession).toHaveBeenCalled());
    resolveSession({ data: null, error: null });
    await Promise.all([first, second]);

    expect(sessionClient.getSession).toHaveBeenCalledOnce();
    expect(sessionClient.signOut).toHaveBeenCalledOnce();
  });
});
