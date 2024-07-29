import fp from 'lodash/fp';

export interface AddressDTO {
  refId: string;
  addressKind: AddressKinds;
  address: string;
  /**
   * @deprecated See {@link address}
   */
  houseNumber?: string;
  /**
   * @deprecated See {@link address}
   */
  street?: string;
  /**
   * @deprecated See {@link address}
   */
  postalCode: string;
  /**
   * @deprecated See {@link address}
   */
  city: string;
  latitude?: number;
  longitude?: number;
  score?: number;
}

export enum AddressKinds {
  Housing = 'Housing',
  Owner = 'Owner'
}

// TODO: improve this function
export function formatAddress(
  address: Pick<AddressDTO, 'houseNumber' | 'street' | 'postalCode' | 'city'>
): string[] {
  const reduce = fp.pipe(fp.compact);

  return reduce([
    address.street?.startsWith(address.houseNumber ?? '')
      ? address.street
      : `${address.houseNumber} ${address.street}`,
    `${address.postalCode} ${address.city}`
  ]);
}
