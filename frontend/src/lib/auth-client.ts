import { createAuthClient } from 'better-auth/react';

import config from '~/utils/config';

// The full inferred return type of `createAuthClient` references internal
// better-auth modules (`path-to-object`, `client/types`) that aren't exported
// through the package's `exports` map, which breaks `.d.ts` emission under
// composite tsconfig. We type the surface area we actually use; the broad
// `any` for hooks/methods that take varied shapes is the local trade-off.
interface AuthClient {
  signIn: {
    email: (input: { email: string; password: string }) => Promise<{
      data: unknown;
      error: { message?: string; status: number; statusText: string } | null;
    }>;
  };
  signOut: () => Promise<unknown>;
  useSession: () => {
    data: {
      user?: { id: string; email: string; name?: string } & Record<string, unknown>;
      session?: { activeEstablishmentId?: string | null } & Record<string, unknown>;
    } | null;
    isPending: boolean;
    error: unknown;
    refetch: () => void;
  };
  getSession: () => Promise<unknown>;
}

export const authClient = createAuthClient({
  baseURL: config.apiEndpoint
}) as unknown as AuthClient;
