import { UserDTO } from '../../shared/models/UserDTO';

export const SALT_LENGTH = 10;

export interface UserApi extends Omit<UserDTO, 'activatedAt'> {
  password: string;
  activatedAt: Date;
  lastAuthenticatedAt?: Date;
  deletedAt?: Date;
}

export function toUserDTO(user: UserApi): UserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    activatedAt: user.activatedAt.toISOString(),
    establishmentId: user.establishmentId,
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
