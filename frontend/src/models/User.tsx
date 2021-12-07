export interface AuthUser {
    user: User,
    accessToken: string
}

export interface User {
    email: string,
    firstName: string,
    lastName: string,
    establishment: {
        id: number,
        name: string,
        housingScopes: string[],
        localities: {
            geoCode: string,
            name: string
        }[]
    }
}
