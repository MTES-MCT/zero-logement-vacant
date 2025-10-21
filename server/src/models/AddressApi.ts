import { AddressDTO, type AddressKinds, type HousingDTO, type OwnerDTO } from '@zerologementvacant/models';

import { reduceStringArray } from '~/utils/stringUtils';

export interface AddressApi extends AddressDTO {
  refId: HousingDTO['id'] | OwnerDTO['id']
  addressKind: AddressKinds
  lastUpdatedAt?: string;
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
