export interface Housing {
    id: string;
    address: string[];
    owner: string;
    tags: string[];
}

export interface HousingFilters {
    individualOwner?: boolean;
    age75?: boolean;
    multiOwner?: boolean;
    beneficiary2?: boolean;
    ownerKind?: string;
    beneficiaryCount?: number;
    housingKind?: string;
}
