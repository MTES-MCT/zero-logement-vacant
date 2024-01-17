import { reduceStringArray } from '../utils/stringUtils';
import { AddressDTO, AddressKinds } from '../../shared/models/AdresseDTO';

export type AddressApi = AddressDTO;

export interface AddressToNormalize {
  refId: string;
  addressKind: AddressKinds;
  rawAddress: string[];
  geoCode?: string;
}

export const formatAddressApi = (addressApi?: AddressApi) => {
  if (addressApi) {
    return reduceStringArray([
      addressApi.street?.startsWith(addressApi.houseNumber ?? '')
        ? addressApi.street
        : [addressApi.houseNumber, addressApi.street].join(' '),
      [addressApi.postalCode, addressApi.city].join(' '),
    ]);
  }
};
