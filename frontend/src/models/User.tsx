import { Establishment } from './Establishment';
import { UserDTO } from '../../../shared/models/UserDTO';

export interface AuthUser {
  user: User;
  accessToken: string;
  establishment: Establishment;
}

export interface User extends Omit<UserDTO, 'activatedAt'> {
  activatedAt: Date;
}

export interface DraftUser extends Pick<User, 'email' | 'establishmentId'> {
  password: string;
  campaignIntent?: string;
}

export enum UserRoles {
  Usual,
  Admin,
}
