export interface Housing {
    id: string;
    address: string;
    municipality: string;
    ownerFullName: string;
    ownerAddress: string;
    ownerId: string;
}

export interface HousingDetails {
    id: string;
    address: string;
    municipality: string;
    surface?: number;
    kind?: string;
    rooms?: number;
    buildingYear: number;
    vacancyStart: number;
}
