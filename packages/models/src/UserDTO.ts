import type { TimePerWeek } from './TimePerWeek';
import { UserRole } from './UserRole';

export const SUSPENDED_CAUSE_VALUES = [
  'droits utilisateur expires',
  'droits structure expires',
  'cgu vides'
] as const;

export type SuspendedCause = (typeof SUSPENDED_CAUSE_VALUES)[number];

/**
 * Represents the suspended cause field which can contain:
 * - null: user is not suspended
 * - A single cause: one of the SUSPENDED_CAUSE_VALUES
 * - Multiple causes: comma-separated string of SUSPENDED_CAUSE_VALUES
 */
export type SuspendedCauseField = string | null;

/**
 * Represents an establishment that a user has access to via Portail DF.
 */
export interface UserEstablishment {
  establishmentId: string;
  establishmentSiren: string;
  hasCommitment: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  timePerWeek: TimePerWeek | null;
  /** Current/primary establishment ID */
  establishmentId: string | null;
  /** List of all establishments the user has access to (multi-structure support) */
  authorizedEstablishments?: UserEstablishment[];
  role: UserRole;
  activatedAt: string;
  lastAuthenticatedAt: string | null;
  suspendedAt: string | null;
  suspendedCause: SuspendedCauseField;
  updatedAt: string;
  kind: string | null;
}

export type UserCreationPayload = Pick<
  UserDTO,
  'email' | 'firstName' | 'lastName' | 'phone' | 'position' | 'timePerWeek'
>;

export type UserUpdatePayload = Pick<
  UserDTO,
  'firstName' | 'lastName' | 'phone' | 'position' | 'timePerWeek'
> & {
  password?: {
    before: string;
    after: string;
  };
};

/**
 * @deprecated Use {@link UserDTO} instead.
 */
export interface UserAccountDTO {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  timePerWeek: TimePerWeek | null;
}

export function isAdmin(user: Pick<UserDTO, 'role'>): boolean {
  return user.role === UserRole.ADMIN;
}

/**
 * Parses a suspended cause field and returns an array of valid SuspendedCause values.
 * Invalid causes are filtered out.
 *
 * @param suspendedCause - The suspended cause field (can be null, single cause, or comma-separated causes)
 * @returns Array of valid SuspendedCause values
 *
 * @example
 * parseSuspendedCauses('droits utilisateur expires, cgu vides')
 * // => ['droits utilisateur expires', 'cgu vides']
 *
 * parseSuspendedCauses(null)
 * // => []
 */
export function parseSuspendedCauses(suspendedCause: SuspendedCauseField): SuspendedCause[] {
  if (!suspendedCause) {
    return [];
  }

  const causes = suspendedCause.split(',').map(c => c.trim());
  return causes.filter((cause): cause is SuspendedCause =>
    SUSPENDED_CAUSE_VALUES.includes(cause as SuspendedCause)
  );
}

/**
 * Checks if a string is a valid SuspendedCause.
 *
 * @param cause - The string to check
 * @returns True if the cause is valid
 */
export function isValidSuspendedCause(cause: string): cause is SuspendedCause {
  return SUSPENDED_CAUSE_VALUES.includes(cause as SuspendedCause);
}
