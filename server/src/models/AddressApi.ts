import { AddressDTO, AddressKinds } from '@zerologementvacant/shared';
import { reduceStringArray } from '~/utils/stringUtils';

export type AddressApi = AddressDTO;

export interface AddressToNormalize {
  refId: string;
  addressKind: AddressKinds;
  rawAddress: string[];
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
