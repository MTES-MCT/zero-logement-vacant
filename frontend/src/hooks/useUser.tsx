import { UserRole } from '@zerologementvacant/models';
import type { AuthRole } from '@zerologementvacant/models';

import { useAppDispatch, useAppSelector } from '~/hooks/useStore';
import {
  fromEstablishmentDTO,
  type Establishment
} from '~/models/Establishment';
import { zlvApi } from '~/services/api.service';
import authenticationSlice from '~/store/reducers/authenticationReducer';

import { useOptionalAuth } from './useAuth';

/**
 * Transition adapter, shaped like the legacy Redux-backed `useUser` so the
 * existing call-sites keep working unchanged.
 *
 * Dual-path during the auth-v2 transition window:
 * - When `AuthProvider` is mounted (auth-v2 flag on), source from the
 *   cookie-backed {@link useOptionalAuth} (which wraps better-auth's
 *   `useSession()`), projecting the better-auth shape onto the legacy shape:
 *   1. `AuthRole` string → `UserRole` enum.
 *   2. `EstablishmentDTO` (`siren: string`) → frontend `Establishment`
 *      (`siren: number`).
 * - When it is not mounted (flag off), fall back to the legacy Redux/JWT
 *   state. Calling `useOptionalAuth()` (not `useAuth()`) is what keeps this
 *   from throwing when there is no provider.
 *
 * The dual-path is removed in Part B (post-cutover); delete this hook once
 * every call-site has migrated to `useAuth()` directly.
 */
const ROLE_STRING_TO_ENUM: Record<AuthRole, UserRole> = {
  usual: UserRole.USUAL,
  admin: UserRole.ADMIN,
  visitor: UserRole.VISITOR
};

interface DerivableUser {
  role?: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
}

function derive(
  user: DerivableUser | undefined,
  isAuthenticated: boolean,
  authorizedEstablishments: readonly unknown[] | undefined
) {
  const isAdmin = isAuthenticated && user?.role === UserRole.ADMIN;
  const isGuest = !isAuthenticated;
  const isUsual = isAuthenticated && user?.role === UserRole.USUAL;
  const isVisitor = isAuthenticated && user?.role === UserRole.VISITOR;

  const hasMultipleEstablishments = (authorizedEstablishments?.length ?? 0) > 1;
  const canChangeEstablishment =
    isAdmin || isVisitor || (isUsual && hasMultipleEstablishments);

  function displayName(): string {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.email) {
      return user.email;
    }
    return '';
  }

  return {
    isAdmin,
    isGuest,
    isUsual,
    isVisitor,
    canChangeEstablishment,
    displayName
  };
}

export function useUser() {
  // Both hooks must run unconditionally (rules of hooks). `auth` is null when
  // AuthProvider is not mounted (auth-v2 flag off) — then we fall back to the
  // legacy Redux-backed state.
  const auth = useOptionalAuth();
  const dispatch = useAppDispatch();
  const { logIn } = useAppSelector((state) => state.authentication);

  if (auth !== null) {
    const user = auth.user
      ? {
          ...auth.user,
          role: ROLE_STRING_TO_ENUM[auth.user.role] ?? UserRole.USUAL
        }
      : undefined;
    const establishment: Establishment | undefined = auth.establishment
      ? fromEstablishmentDTO(auth.establishment)
      : undefined;
    const authorizedEstablishments =
      auth.authorizedEstablishments.map(fromEstablishmentDTO);

    return {
      ...derive(user, auth.isAuthenticated, authorizedEstablishments),
      logOut: () => {
        void auth.signOut();
      },
      establishment,
      authorizedEstablishments,
      effectiveGeoCodes: auth.effectiveGeoCodes,
      user,
      isAuthenticated: auth.isAuthenticated,
      error: undefined as unknown,
      isError: false,
      isLoading: auth.isLoading,
      isUninitialized: false,
      isSuccess: auth.isAuthenticated
    };
  }

  const { data, error, isError, isLoading, isUninitialized, isSuccess } = logIn;
  const isAuthenticated =
    !!data?.accessToken && !!data?.user && !!data?.establishment;

  return {
    ...derive(data?.user, isAuthenticated, data?.authorizedEstablishments),
    logOut: () => {
      // Reset RTK Query cache to clear all cached data from previous user
      dispatch(zlvApi.util.resetApiState());
      dispatch(authenticationSlice.actions.logOut());
    },
    establishment: data?.establishment,
    authorizedEstablishments: data?.authorizedEstablishments,
    effectiveGeoCodes: data?.effectiveGeoCodes,
    user: data?.user,
    isAuthenticated,
    error,
    isError,
    isLoading,
    isUninitialized,
    isSuccess
  };
}
