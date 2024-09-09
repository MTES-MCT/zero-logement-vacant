import { AddressDTO, AddressKinds } from '@zerologementvacant/models';
import { reduceStringArray } from '~/utils/stringUtils';

export interface AddressApi extends AddressDTO {
  lastUpdatedAt?: string;
}

export interface AddressToNormalize {
  refId: string;
  addressKind: AddressKinds;
  addressDGFIP: string[];
  geoCode?: string;
}

export const formatAddressApi = (
  addressApi?: AddressApi | null | undefined
) => {
  if (addressApi) {
    return reduceStringArray([
      addressApi.street?.startsWith(addressApi.houseNumber ?? '')
        ? addressApi.street
        : [addressApi.houseNumber, addressApi.street].join(' '),
      [addressApi.postalCode, addressApi.city].join(' ')
    ]);
  }
};
