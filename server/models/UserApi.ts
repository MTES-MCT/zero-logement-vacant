export interface UserApi {
    id: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    establishmentId?: string,
    role: number,
    activatedAt?: Date,
    activationSendAt?: Date
}


export interface RequestUser {
    userId: string;
    establishmentId: string;
    role: UserRoles;
}

export enum UserRoles {
    Usual, Admin
}

export interface AuthTokenApi {
    id: string,
    userId: string,
    createdAt: Date
}
