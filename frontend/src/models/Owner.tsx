export interface DraftOwner {
    rawAddress: string[];
    fullName: string;
    birthDate?: Date;
    email?: string;
    phone?: string;
}

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
    origin?: string;
}
