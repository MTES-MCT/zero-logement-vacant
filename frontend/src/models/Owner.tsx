export interface Owner {
    id: string;
    rawAddress: string[];
    fullName: string;
    administrator?: string;
    birthDate?: Date;
    email?: string;
    phone?: string;
}

export interface HousingOwner extends Owner {
    housingId: string;
    rank: number;
    startDate?: Date;
    endDate?: Date;
}
