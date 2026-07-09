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
 * Auth-v2 is mounted at application boot, so production code sources from the
 * cookie-backed {@link useOptionalAuth} / better-auth `useSession()` path and
 * projects that shape onto the legacy shape:
 *   1. `AuthRole` string → `UserRole` enum.
 *   2. `EstablishmentDTO` (`siren: string`) → frontend `Establishment`
 *      (`siren: number`).
 *
 * The Redux/JWT fallback is kept temporarily for isolated tests and legacy
 * cleanup work. Delete it once every call-site has migrated to `useAuth()`
 * directly and the legacy auth slice/thunks are removed.
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
  // Both hooks must run unconditionally (rules of hooks). `auth` should be
  // present in the application shell; the fallback remains only as a temporary
  // compatibility path for tests and legacy cleanup.
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
