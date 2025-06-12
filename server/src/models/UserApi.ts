import { UserAccountDTO, UserDTO } from '@zerologementvacant/models';
import fp from 'lodash/fp';

export const SALT_LENGTH = 10;

export type UserApi = UserDTO & {
  password: string;
  phone?: string;
  position?: string;
  timePerWeek?: string;
  // Timestamps
  lastAuthenticatedAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

export function fromUserDTO(user: UserDTO): UserApi {
  return {
    ...user,
    password: ''
  };
}

export function toUserDTO(user: UserApi): UserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    establishmentId: user.establishmentId,
    activatedAt: user.activatedAt
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

export function detectDomain(users: UserApi[]): string | null {
  const getDomain = (email: string): string => {
    return email.substring(email.indexOf('@') + 1);
  };

  return fp.pipe(
    fp.countBy<UserApi>((user) => getDomain(user.email)),
    Object.entries,
    fp.map(([domain, count]) => {
      return {
        domain,
        count
      };
    }),
    fp.filter((value) => isAllowedDomain(value.domain)),
    fp.maxBy((value) => value.count),
    (value) => value?.domain ?? null
  )(users);
}

function isAllowedDomain(domain: string): boolean {
  const domains = [
    'gmail.com',
    'hotmail.fr',
    'hotmail.com',
    'wanadoo.fr',
    'wanadoo.com'
  ];
  return !domains.includes(domain);
}

export interface TokenPayload {
  userId: string;
  establishmentId: string;
}

export enum UserRoles {
  Usual,
  Admin,
  Visitor
}
