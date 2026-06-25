import { UserRole } from '@zerologementvacant/models';
import type { AuthRole } from '@zerologementvacant/models';

import { fromEstablishmentDTO } from '~/models/Establishment';
import { useAuth } from './useAuth';

/**
 * Transition adapter. Sourced from {@link useAuth} (which itself wraps
 * `better-auth/react`'s `useSession()`), shaped like the legacy Redux-backed
 * `useUser` so the 41 existing call-sites keep working unchanged.
 *
 * Two intentional projections happen here:
 * 1. `AuthRole` string → `UserRole` enum, so `user.role === UserRole.ADMIN`
 *    comparisons still type-check and behave identically.
 * 2. `null` → `undefined` for `establishment`, matching the legacy shape.
 *
 * New components should call `useAuth()` directly with the canonical
 * better-auth conventions. Migrate call-sites incrementally; delete this
 * hook once empty.
 */
const ROLE_STRING_TO_ENUM: Record<AuthRole, UserRole> = {
  usual: UserRole.USUAL,
  admin: UserRole.ADMIN,
  visitor: UserRole.VISITOR
};

export function useUser() {
  const {
    user: authUser,
    establishment,
    authorizedEstablishments,
    isAuthenticated,
    isLoading,
    signOut
  } = useAuth();

  const user = authUser
    ? {
        ...authUser,
        role: ROLE_STRING_TO_ENUM[authUser.role] ?? UserRole.USUAL
      }
    : undefined;

  // Project EstablishmentDTO (`siren: string`) → frontend `Establishment`
  // (`siren: number`) so the 41 useUser call-sites that pass establishment
  // into legacy-typed props keep type-checking.
  const projectedEstablishment = establishment
    ? fromEstablishmentDTO(establishment)
    : undefined;
  const projectedAuthorizedEstablishments = authorizedEstablishments.map(
    fromEstablishmentDTO
  );

  const isAdmin = isAuthenticated && user?.role === UserRole.ADMIN;
  const isGuest = !isAuthenticated;
  const isUsual = isAuthenticated && user?.role === UserRole.USUAL;
  const isVisitor = isAuthenticated && user?.role === UserRole.VISITOR;

  const hasMultipleEstablishments =
    (authorizedEstablishments?.length ?? 0) > 1;
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

  function logOut() {
    void signOut();
  }

  return {
    displayName,
    logOut,
    establishment: projectedEstablishment,
    authorizedEstablishments: projectedAuthorizedEstablishments,
    user,
    isAdmin,
    isAuthenticated,
    isGuest,
    isUsual,
    isVisitor,
    canChangeEstablishment,
    error: undefined as unknown,
    isError: false,
    isLoading,
    isUninitialized: false,
    isSuccess: isAuthenticated
  };
}
