export interface Housing {
    id: string;
    address: string;
    municipality: string;
    ownerFullName: string;
    ownerId: string;
    tags: string[];
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

export interface HousingFilters {
    ownerKind?: string;
    ownerAge?: string;
    multiOwner?: boolean;
    beneficiaryCount?: number;
    housingKind?: string;
    housingState?: string;
    housingArea?: string;
    vacancyDuration?: string;
}
