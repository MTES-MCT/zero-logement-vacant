import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useState
} from 'react';

import { authClient } from '~/lib/auth-client';
import type { Establishment } from '~/models/Establishment';
import type { User } from '~/models/User';
import { zlvApi } from '~/services/api.service';
import { useAppDispatch } from '~/hooks/useStore';
import config from '~/utils/config';

export interface AuthContextValue {
  user: User | null;
  establishment: Establishment | null;
  authorizedEstablishments: Establishment[];
  effectiveGeoCodes: string[] | undefined;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changeEstablishment: (establishmentId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: Readonly<PropsWithChildren>) {
  const dispatch = useAppDispatch();
  const { data: session, isPending } = authClient.useSession();

  // TODO: hydrate establishment / authorizedEstablishments / effectiveGeoCodes
  // from a dedicated session-context endpoint once the backend exposes one.
  // For now, establishment data only populates after a manual changeEstablishment call.
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [effectiveGeoCodes, setEffectiveGeoCodes] = useState<
    string[] | undefined
  >(undefined);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      throw new Error(error.message ?? 'Échec de l’authentification.');
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    dispatch(zlvApi.util.resetApiState());
    setEstablishment(null);
    setEffectiveGeoCodes(undefined);
  }, [dispatch]);

  const changeEstablishment = useCallback(async (establishmentId: string) => {
    const response = await fetch(
      `${config.apiEndpoint}/api/account/establishments/${establishmentId}`,
      { method: 'POST', credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error('Failed to change establishment');
    }
    const data = (await response.json()) as {
      establishment: Establishment;
      effectiveGeoCodes?: string[];
    };
    setEstablishment(data.establishment);
    setEffectiveGeoCodes(data.effectiveGeoCodes);
  }, []);

  // The better-auth session user shape differs from the ZLV `User` (e.g. no
  // activatedAt / role yet). Until a hydration endpoint is wired up, cast
  // through `unknown` to expose the minimal `{ id, email }` surface as `User`.
  const userFromSession = (session?.user ?? null) as unknown as User | null;

  const value: AuthContextValue = {
    user: userFromSession,
    establishment,
    authorizedEstablishments: [],
    effectiveGeoCodes,
    isLoading: isPending,
    signIn,
    signOut,
    changeEstablishment
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
