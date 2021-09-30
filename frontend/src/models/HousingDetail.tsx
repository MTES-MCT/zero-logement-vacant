export interface HousingDetail {
    id: string;
    address: string[];
    owner: Owner;
    tags: string[];
}

export interface Owner {
    fullName: string;
    birthDate: Date;
}
