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

export interface Establishment {
    id: string,
    name: string,
    housingScopes: string[],
    localities: {
        geoCode: string,
        name: string
    }[]
}

export const isValidUser = (authUser: AuthUser) => authUser && authUser.accessToken && authUser.establishment && authUser.user
