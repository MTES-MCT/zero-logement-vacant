import { Establishment } from './Establishment';

export interface AuthUser {
    user: User,
    accessToken: string,
    establishment: Establishment
}

export interface User {
    email: string,
    firstName: string,
    lastName: string
}

export const isValidUser = (authUser: AuthUser) => authUser && authUser.accessToken && authUser.establishment && authUser.user
