export interface Housing {
    id: string;
    address: string[];
    owner: string;
    tags: string[];
}

export enum HousingFilters {
    IndividualOwner = 'IndividualOwner', Age75= 'Age75', MultiOwner = 'MultiOwner', Beneficiary2= 'Beneficiary2'
}
