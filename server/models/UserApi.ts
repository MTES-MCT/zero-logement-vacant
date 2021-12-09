export interface UserApi {
    id: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    establishmentId?: number
}


export interface RequestUser {
    userId: string;
    establishmentId: number;
}
