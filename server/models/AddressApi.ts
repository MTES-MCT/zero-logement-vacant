export interface AddressApi {
  refId: string;
  addressKind: AddressKinds;
  houseNumber?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  score?: number;
}

export enum AddressKinds {
  Housing = 'Housing',
  Owner = 'Owner',
}

export interface AddressToNormalize {
  refId: string;
  addressKind: AddressKinds;
  rawAddress: string[];
  geoCode?: string;
}
