export interface Owner {
    id: string;
    rawAddress: string[];
    fullName: string;
    administrator?: string;
    birthDate?: Date;
    email?: string;
    phone?: string;
}
