import { createAuthClient } from 'better-auth/react';
import { customSessionClient } from 'better-auth/client/plugins';
import type { SessionDTO } from '@zerologementvacant/models';

import config from '~/utils/config';

// The full inferred return type of `createAuthClient` references internal
// better-auth modules (`path-to-object`, `client/types`) that aren't exported
// through the package's `exports` map, which breaks `.d.ts` emission under
// composite tsconfig. We type the surface area we actually use; the broad
// `any` for hooks/methods that take varied shapes is the local trade-off.
//
// The session shape mirrors the customSession plugin on the server
// (server/src/infra/auth.ts) which augments getSession with the ZLV business
// data the frontend needs in one reactive call — the wire contract is
// defined once in `SessionDTO` (@zerologementvacant/models).
interface AuthClient {
  signIn: {
    email: (input: { email: string; password: string }) => Promise<{
      data: unknown;
      error: { message?: string; status: number; statusText: string } | null;
    }>;
  };
  signOut: () => Promise<unknown>;
  useSession: () => {
    data: SessionDTO | null;
    isPending: boolean;
    error: unknown;
    refetch: () => void;
  };
  getSession: () => Promise<unknown>;
}

// Cast through `unknown` because better-auth's inferred return type can't
// satisfy our hand-typed `AuthClient` interface — the customSession plugin's
// `$Infer.Session` is `{}` upstream, so server augmentations aren't visible
// in the inferred client shape. The `AuthClient` interface above is the
// trusted contract (mirrors server SessionDTO + signIn/out signatures).
export const authClient = createAuthClient({
  baseURL: config.apiEndpoint,
  basePath: '/auth',
  plugins: [customSessionClient()]
}) as unknown as AuthClient;
