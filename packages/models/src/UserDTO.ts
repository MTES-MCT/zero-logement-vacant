import { UserRole } from './UserRole';

export interface UserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  establishmentId: string | null;
  role: UserRole;
  activatedAt: string | null;
}

export interface UserAccountDTO {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  timePerWeek: string | null;
}

export function isAdmin(user: Pick<UserDTO, 'role'>): boolean {
  return user.role === UserRole.ADMIN;
}
