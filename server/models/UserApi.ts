export interface UserApi {
    id: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    establishmentId?: string,
    role: number,
    activatedAt?: Date
}


export interface RequestUser {
    userId: string;
    establishmentId: string;
    role: UserRoles;
}

export enum UserRoles {
    Usual, Admin
}
