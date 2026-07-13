import type {
  AuthUserDTO,
  EstablishmentDTO,
  SessionDTO
} from '@zerologementvacant/models';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useMemo
} from 'react';

import { useAppDispatch } from '~/hooks/useStore';
import { authClient } from '~/lib/auth-client';
import { zlvApi } from '~/services/api.service';
import config from '~/utils/config';
import sentry from '~/utils/sentry';

export interface AuthContextValue {
  user: AuthUserDTO | null;
  establishment: EstablishmentDTO | null;
  authorizedEstablishments: readonly EstablishmentDTO[];
  effectiveGeoCodes: string[] | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAdmin: (
    email: string,
    password: string,
    establishmentId: string
  ) => Promise<{ requiresTwoFactor: boolean; email: string }>;
  verifyAdminTwoFactor: (
    email: string,
    code: string,
    establishmentId: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  changeEstablishment: (establishmentId: string) => Promise<void>;
  /** Force a re-read of the session payload from the server. */
  refetch: () => Promise<void>;
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
  const hasSession = session !== null;
  const authenticatedUserId = session?.user.id ?? null;
  const activeEstablishmentId = session?.session.activeEstablishmentId ?? null;
  const isAuthenticated = Boolean(
    session?.user && session.establishment && activeEstablishmentId
  );
  const previousAuthenticatedScope = useRef({
    userId: authenticatedUserId,
    establishmentId: activeEstablishmentId
  });

  useEffect(() => {
    if (isPending) {
      return;
    }

    sentry.setUser(
      session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role
          }
        : null
    );
  }, [isPending, session?.user]);

  useEffect(() => {
    const previousScope = previousAuthenticatedScope.current;
    if (
      previousScope.userId !== authenticatedUserId ||
      previousScope.establishmentId !== activeEstablishmentId
    ) {
      dispatch(zlvApi.util.resetApiState());
    }
    previousAuthenticatedScope.current = {
      userId: authenticatedUserId,
      establishmentId: activeEstablishmentId
    };
  }, [activeEstablishmentId, authenticatedUserId, dispatch]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        throw new Error(error.message ?? 'Échec de l’authentification.');
      }
      await refetch();
    },
    [refetch]
  );

  const signInAdmin = useCallback(
    async (email: string, password: string, establishmentId: string) => {
      const response = await fetch(`${config.apiEndpoint}/auth/admin/sign-in`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, establishmentId })
      });
      if (!response.ok) {
        throw new Error('Échec de l’authentification.');
      }
      const challenge = (await response.json()) as {
        requiresTwoFactor: boolean;
        email: string;
      };
      if (!challenge.requiresTwoFactor) {
        await refetch();
      }
      return challenge;
    },
    [refetch]
  );

  const verifyAdminTwoFactor = useCallback(
    async (email: string, code: string, establishmentId: string) => {
      const response = await fetch(
        `${config.apiEndpoint}/auth/admin/verify-2fa`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, establishmentId })
        }
      );
      if (!response.ok) {
        throw new Error('Code de vérification invalide ou expiré.');
      }
      await refetch();
    },
    [refetch]
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    localStorage.removeItem('authUser');
    dispatch(zlvApi.util.resetApiState());
  }, [dispatch]);

  useEffect(() => {
    if (!isPending && hasSession && !isAuthenticated) {
      // A Better Auth session without its ZLV authorization context cannot be
      // used by protected API routes. Revoke it so the user returns to a clean
      // sign-in state instead of being trapped between guest/protected routes.
      signOut().catch(() => undefined);
    }
  }, [hasSession, isAuthenticated, isPending, signOut]);

  const changeEstablishment = useCallback(
    async (establishmentId: string) => {
      // This continues to use the existing Express endpoint until changing an
      // establishment is exposed through better-auth's typed action surface:
      // `server/src/controllers/auth-controller.ts:changeEstablishmentBySession`
      // which mutates `session.activeEstablishmentId` on the DB row.
      const response = await fetch(
        `${config.apiEndpoint}/account/establishments/${establishmentId}`,
        { method: 'POST', credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to change establishment');
      }
      // Re-read the session so useSession() consumers see the new
      // establishment / authorizedEstablishments / effectiveGeoCodes.
      await refetch();
    },
    [refetch]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      establishment: session?.establishment ?? null,
      authorizedEstablishments: session?.authorizedEstablishments ?? [],
      effectiveGeoCodes: session?.effectiveGeoCodes,
      isAuthenticated,
      isLoading: isPending,
      signIn,
      signInAdmin,
      verifyAdminTwoFactor,
      signOut,
      changeEstablishment,
      refetch
    }),
    [
      changeEstablishment,
      isAuthenticated,
      isPending,
      refetch,
      session,
      signIn,
      signInAdmin,
      signOut,
      verifyAdminTwoFactor
    ]
  );

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
