export interface AddressApi {
    refId: string;
    addressKind: AddressKinds;
    houseNumber?: string;
    street: string;
    postalCode: string;
    city: string;
    x: number;
    y: number;
    score: number;
}


export enum AddressKinds {
    Housing='Housing', Owner = 'Owner'
}
