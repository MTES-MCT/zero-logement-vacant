import { Establishment } from './Establishment';
import { UserDTO } from '@zerologementvacant/models';

export interface AuthUser {
  user: User;
  accessToken: string;
  establishment: Establishment;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRoles;
  activatedAt: Date;
  establishmentId: string;
}

export const fromUserDTO = (user: UserDTO): User => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  // TODO: avoid !
  establishmentId: user.establishmentId!,
  role: user.role,
  // TODO: avoid !
  activatedAt: new Date(user.activatedAt!),
});

export interface UserAccount {
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  timePerWeek?: string;
}

export interface DraftUser {
  email: string;
  password: string;
  establishmentId: string;
  campaignIntent?: string;
}

export enum UserRoles {
  Usual,
  Admin,
}
