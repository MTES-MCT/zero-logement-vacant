import { type PropsWithChildren, createContext, useCallback } from 'react';

import type {
  AuthUserDTO,
  EstablishmentDTO,
  SessionDTO
} from '@zerologementvacant/models';

import { authClient } from '~/lib/auth-client';
import { zlvApi } from '~/services/api.service';
import { useAppDispatch } from '~/hooks/useStore';
import config from '~/utils/config';

export interface AuthContextValue {
  user: AuthUserDTO | null;
  establishment: EstablishmentDTO | null;
  authorizedEstablishments: readonly EstablishmentDTO[];
  effectiveGeoCodes: string[] | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changeEstablishment: (establishmentId: string) => Promise<void>;
  /** Force a re-read of the session payload from the server. */
  refetch: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for auth state on the frontend. Wraps better-auth's
 * `useSession()` which is itself a reactive nanostore (handles cross-tab
 * sync, focus refetch, online refetch out of the box). The session payload
 * is augmented server-side by the `customSession` plugin in
 * `server/src/infra/auth.ts` so `data` already carries `establishment`,
 * `authorizedEstablishments`, and `effectiveGeoCodes` — no follow-up fetch
 * needed.
 */
export function AuthProvider(props: Readonly<PropsWithChildren>) {
  const dispatch = useAppDispatch();
  const { data, isPending, refetch } = authClient.useSession();

  const session: SessionDTO | null = data ?? null;

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      throw new Error(error.message ?? 'Échec de l’authentification.');
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    dispatch(zlvApi.util.resetApiState());
  }, [dispatch]);

  const changeEstablishment = useCallback(
    async (establishmentId: string) => {
      // TODO: migrate to a better-auth plugin endpoint
      // (`authClient.changeEstablishment({ establishmentId })`) once auth-v1
      // is decommissioned, so this stops bypassing better-auth's typed action
      // surface. For now we hit the existing Express endpoint at
      // `server/src/controllers/auth-controller.ts:changeEstablishmentBySession`
      // which mutates `session.activeEstablishmentId` on the DB row.
      const response = await fetch(
        `${config.apiEndpoint}/api/account/establishments/${establishmentId}`,
        { method: 'POST', credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to change establishment');
      }
      // Re-read the session so useSession() consumers see the new
      // establishment / authorizedEstablishments / effectiveGeoCodes.
      refetch();
    },
    [refetch]
  );

  const value: AuthContextValue = {
    user: session?.user ?? null,
    establishment: session?.establishment ?? null,
    authorizedEstablishments: session?.authorizedEstablishments ?? [],
    effectiveGeoCodes: session?.effectiveGeoCodes,
    isAuthenticated: session !== null,
    isLoading: isPending,
    signIn,
    signOut,
    changeEstablishment,
    refetch
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
