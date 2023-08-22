import { Establishment } from './Establishment';
import { UserDTO } from '../../../shared/models/UserDTO';

export interface AuthUser {
  user: User;
  accessToken: string;
  establishment: Establishment;
}

export interface User extends UserDTO {
  role: UserRoles;
  activatedAt: Date;
  establishmentId: string;
}

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
