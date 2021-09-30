export interface Housing {
    id: string;
    address: string[];
    owner: string;
    tags: string[];
}

export interface HousingFilters {
    individualOwner?: boolean;
    ageGt75?: boolean;
    multiOwner?: boolean;
    beneficiaryGt2?: boolean;
    ownerKind?: string;
    ownerAge?: string;
    beneficiaryCount?: number;
    housingKind?: string;
}
