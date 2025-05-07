import { UserDTO } from '@zerologementvacant/models';
import { Establishment } from './Establishment';

export interface AuthUser {
  user: User;
  accessToken: string;
  establishment: Establishment;
  jimoData: object;
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

export function createdBy(
  user: Pick<User, 'email' | 'firstName' | 'lastName'>
): string {
  return user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email;
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
  activatedAt: new Date(user.activatedAt!)
});

export const toUserDTO = (user: User): UserDTO => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  establishmentId: user.establishmentId,
  role: user.role,
  activatedAt: user.activatedAt.toJSON()
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
}

export enum UserRoles {
  Usual,
  Admin,
  Visitor
}
