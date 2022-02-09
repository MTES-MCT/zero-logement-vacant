export interface OwnerApi {
    id: string;
    rawAddress: string[];
    fullName: string;
    administrator?: string;
    birthDate?: string;
    email?: string;
    phone?: string;
}
