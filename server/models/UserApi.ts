import { EstablishmentApi } from './EstablishmentApi';

export interface UserApi {
    id: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    establishment: EstablishmentApi
}


export interface RequestUser {
    userId: string;
    establishmentId: number;
}
