import { Establishment } from './Establishment';

export interface AuthUser {
    user: User,
    accessToken: string,
    establishment: Establishment
}

export interface User {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: UserRoles,
    activatedAt?: Date,
    activationSendAt?: Date,
    establishmentId: string
}

export enum UserRoles {
    Usual, Admin
}

export const isValidUser = (authUser: AuthUser) => authUser && authUser.accessToken && authUser.establishment && authUser.user
