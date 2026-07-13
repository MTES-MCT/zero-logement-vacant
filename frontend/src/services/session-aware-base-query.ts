import type { fetchBaseQuery } from '@reduxjs/toolkit/query';

import { authClient } from '~/lib/auth-client';

type FetchBaseQuery = ReturnType<typeof fetchBaseQuery>;
type SessionClient = Pick<typeof authClient, 'getSession' | 'signOut'>;

export function createSessionAwareBaseQuery(
  baseQuery: FetchBaseQuery,
  sessionClient: SessionClient = authClient
): FetchBaseQuery {
  let sessionCheck: Promise<void> | null = null;

  return async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);
    if (result.error?.status !== 401) {
      return result;
    }

    sessionCheck ??= (async () => {
      const session = await sessionClient.getSession();
      if (session.data === null && session.error === null) {
        await sessionClient.signOut();
      }
    })();
    const currentCheck = sessionCheck;
    try {
      await currentCheck;
    } finally {
      if (sessionCheck === currentCheck) {
        sessionCheck = null;
      }
    }

    return result;
  };
}
