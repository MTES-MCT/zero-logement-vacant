import { User } from '../../shared/models/User';

export const SALT_LENGTH = 10;

export interface UserApi {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  establishmentId?: string;
  role: number;
  activatedAt?: Date;
}

export function toUserDTO(user: UserApi): User {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    establishmentId: user.establishmentId,
    activatedAt: user.activatedAt,
  };
}

export interface TokenPayload {
  userId: string;
  establishmentId: string;
}

export enum UserRoles {
  Usual,
  Admin,
}

export function isActivated(user: UserApi): boolean {
  return !!user.activatedAt;
}
