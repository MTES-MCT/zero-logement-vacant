import { AddressDTO } from '@zerologementvacant/models';

import { reduceStringArray } from '~/utils/stringUtils';

export interface AddressApi extends AddressDTO {
  lastUpdatedAt?: string;
}

export interface AddressToNormalize
  extends Pick<AddressApi, 'label' | 'refId' | 'addressKind'> {
  geoCode: string;
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
