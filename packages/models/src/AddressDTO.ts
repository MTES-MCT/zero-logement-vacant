import fp from 'lodash/fp';

export interface AddressDTO {
  refId: string;
  addressKind: AddressKinds;
  houseNumber?: string;
  street?: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  score?: number;
}

export enum AddressKinds {
  Housing = 'Housing',
  Owner = 'Owner',
}

export function formatAddress(
  address: Pick<AddressDTO, 'houseNumber' | 'street' | 'postalCode' | 'city'>,
  additionalAddress?: string,
): string[] {
  const reduce = fp.pipe(fp.compact);

  return reduce([
    address.street?.startsWith(address.houseNumber ?? '')
      ? address.street
      : `${address.houseNumber} ${address.street}`,
    additionalAddress,
    `${address.postalCode} ${address.city}`,
  ]);
}
