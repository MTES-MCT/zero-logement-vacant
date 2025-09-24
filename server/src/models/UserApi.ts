import { UserAccountDTO, UserDTO, UserRole } from '@zerologementvacant/models';

export const SALT_LENGTH = 10;

export type UserApi = UserDTO & {
  password: string;
  // Timestamps
  deletedAt: string | null;
};

export function fromUserDTO(user: UserDTO): UserApi {
  return {
    ...user,
    phone: null,
    position: null,
    timePerWeek: null,
    password: '',
    lastAuthenticatedAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    deletedAt: null
  };
}

export function toUserDTO(user: UserApi): UserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    position: user.position,
    timePerWeek: user.timePerWeek,
    role: user.role,
    establishmentId: user.establishmentId,
    activatedAt: user.activatedAt,
    lastAuthenticatedAt: user.lastAuthenticatedAt,
    updatedAt: user.updatedAt
  };
}

export function toUserAccountDTO(user: UserApi): UserAccountDTO {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    position: user.position,
    timePerWeek: user.timePerWeek
  };
}

export interface TokenPayload {
  userId: string;
  establishmentId: string;
}

// Keep the old enum for backward compatibility but mark as deprecated
/**
 * @deprecated Use UserRole from @zerologementvacant/models instead
 */
export enum UserRoles {
  Usual,
  Admin,
  Visitor
}

// Map local UserRoles to imported UserRole
export const userRolesToUserRole = {
  [UserRoles.Usual]: UserRole.USUAL,
  [UserRoles.Admin]: UserRole.ADMIN,
  [UserRoles.Visitor]: UserRole.VISITOR
};
