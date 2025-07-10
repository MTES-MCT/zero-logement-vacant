import { UserDTO, UserRole } from '@zerologementvacant/models';
import { Equivalence } from 'effect';

import { Establishment } from './Establishment';

export interface AuthUser {
  user: User;
  accessToken: string;
  establishment: Establishment;
  jimoData: object;
}

export interface User extends Omit<UserDTO, 'activatedAt'> {
  activatedAt: Date;
}

export const USER_EQUIVALENCE = Equivalence.struct({
  id: Equivalence.string
});

export function createdBy(
  user: Pick<User, 'email' | 'firstName' | 'lastName'>
): string {
  if (user.email.endsWith('@beta.gouv.fr')) {
    return ADMIN_LABEL;
  }

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

export function formatAuthor(
  user: Pick<User, 'email' | 'firstName' | 'lastName'>,
  establishment: Pick<Establishment, 'name'> | null
): string {
  const authorName = createdBy(user);
  return establishment ? `${authorName} (${establishment.name})` : authorName;
}

export function isAdmin(user: User): boolean {
  return user.role === UserRole.ADMIN;
}

export const ADMIN_LABEL = 'L’équipe Zéro Logement Vacant';
