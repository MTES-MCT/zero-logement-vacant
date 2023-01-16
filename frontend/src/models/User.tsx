import { Establishment } from './Establishment';

export interface AuthUser {
  user: User;
  accessToken: string;
  establishment: Establishment;
}

export interface User {
  id: string;
  email: string;
  // TODO: this should be string | undefined until we can retrieve first
  // and last name
  firstName: string;
  lastName: string;
  role: UserRoles;
  activatedAt: Date;
  establishmentId: string;
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
