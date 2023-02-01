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
