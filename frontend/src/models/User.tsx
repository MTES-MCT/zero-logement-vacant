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
    establishmentId: string
}

export interface DraftUser {
    email: string,
    firstName: string,
    lastName: string,
    requestNumber: string,
    role: UserRoles,
    establishmentId: string
}

export enum UserRoles {
    Usual, Admin
}

export const isValidUser = (authUser: AuthUser) => authUser && authUser.accessToken && authUser.establishment && authUser.user
