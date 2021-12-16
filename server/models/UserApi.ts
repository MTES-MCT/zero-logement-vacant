export interface UserApi {
    id: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    establishmentId?: string
}


export interface RequestUser {
    userId: string;
    establishmentId: string;
}
