import type {
  AuthUserDTO,
  EstablishmentDTO,
  UserDTO
} from '@zerologementvacant/models';
import { UserRole } from '@zerologementvacant/models';
import type { PropsWithChildren } from 'react';

import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';

const ROLE_ENUM_TO_STRING: Record<UserRole, AuthUserDTO['role']> = {
  [UserRole.USUAL]: 'usual',
  [UserRole.ADMIN]: 'admin',
  [UserRole.VISITOR]: 'visitor'
};

/**
 * Project a legacy {@link UserDTO} (numeric {@link UserRole} enum) into the
 * narrow better-auth {@link AuthUserDTO} (string role) used by the session.
 */
export function toAuthUserDTO(user: UserDTO): AuthUserDTO {
  return {
    id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    firstName: user.firstName,
    lastName: user.lastName,
    role: ROLE_ENUM_TO_STRING[user.role] ?? 'usual',
    suspendedAt: user.suspendedAt,
    suspendedCause: user.suspendedCause
  };
}

export interface MockAuthOptions {
  user?: UserDTO | null;
  establishment?: EstablishmentDTO | null;
  authorizedEstablishments?: readonly EstablishmentDTO[];
  effectiveGeoCodes?: string[];
  isAuthenticated?: boolean;
  isLoading?: boolean;
}

/**
 * Build a static {@link AuthContextValue} from fixtures for tests, mirroring
 * what {@link AuthProvider} derives from `authClient.useSession()` at runtime.
 */
export function genAuthContextValue(
  options?: MockAuthOptions
): AuthContextValue {
  const user = options?.user ? toAuthUserDTO(options.user) : null;
  const establishment = options?.establishment ?? null;
  return {
    user,
    establishment,
    authorizedEstablishments:
      options?.authorizedEstablishments ??
      (establishment ? [establishment] : []),
    effectiveGeoCodes: options?.effectiveGeoCodes,
    isAuthenticated: options?.isAuthenticated ?? user !== null,
    isLoading: options?.isLoading ?? false,
    signIn: async () => {},
    signInAdmin: async (email: string) => ({
      requiresTwoFactor: true,
      email
    }),
    verifyAdminTwoFactor: async () => {},
    signOut: async () => {},
    changeEstablishment: async () => {},
    refetch: async () => {}
  };
}

/**
 * Provides a static {@link AuthContext} for tests. Pass `value` to control the
 * authenticated user / establishment, or `options` to build one from fixtures.
 */
export function MockAuthProvider(
  props: PropsWithChildren<{
    value?: AuthContextValue;
    options?: MockAuthOptions;
  }>
) {
  const value = props.value ?? genAuthContextValue(props.options);
  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
}
