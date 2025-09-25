import type { TimePerWeek } from './TimePerWeek';
import { UserRole } from './UserRole';

export interface UserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  timePerWeek: TimePerWeek | null;
  establishmentId: string | null;
  role: UserRole;
  activatedAt: string;
  lastAuthenticatedAt: string | null;
  updatedAt: string;
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
