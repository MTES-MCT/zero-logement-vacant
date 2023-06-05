import { UserAccountDTO, UserDTO } from '../../shared/models/UserDTO';

export const SALT_LENGTH = 10;

export interface UserApi {
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  establishmentId?: string;
  role: number;
  activatedAt?: Date;
  lastAuthenticatedAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
  phone?: string;
  position?: string;
  timePerWeek?: string;
}

export function toUserDTO(user: UserApi): UserDTO {
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

export function toUserAccountDTO(user: UserApi): UserAccountDTO {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    position: user.position,
    timePerWeek: user.timePerWeek,
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
