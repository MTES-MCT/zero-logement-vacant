import { UserRole } from './UserRole';

export interface UserDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  establishmentId?: string;
  role: UserRole;
  activatedAt?: string;
}

export interface UserAccountDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  timePerWeek?: string;
}

export function isAdmin(user: Pick<UserDTO, 'role'>): boolean {
  return user.role === UserRole.ADMIN;
}
