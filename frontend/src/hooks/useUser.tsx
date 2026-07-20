import { UserRole } from '@zerologementvacant/models';
import type { AuthRole } from '@zerologementvacant/models';

import {
  fromEstablishmentDTO,
  type Establishment
} from '~/models/Establishment';

import { useAuth } from './useAuth';

/**
 * Compatibility adapter, shaped like the legacy Redux-backed `useUser` so the
 * existing call-sites keep working unchanged.
 *
 * Better Auth is mounted at application boot, so this hook sources from the
 * cookie-backed {@link useAuth} / better-auth `useSession()` path and projects
 * that shape onto the legacy shape:
 *   1. `AuthRole` string → `UserRole` enum.
 *   2. `EstablishmentDTO` (`siren: string`) → frontend `Establishment`
 *      (`siren: number`).
 *
 * Delete this hook once every call-site has migrated to `useAuth()` directly.
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
  const canCreateCampaign = isAdmin || isUsual;

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
    canCreateCampaign,
    displayName
  };
}

export function useUser() {
  const auth = useAuth();
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
