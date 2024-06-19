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
  Owner = 'Owner'
}

export function formatAddress(
  address: Pick<AddressDTO, 'houseNumber' | 'street' | 'postalCode' | 'city'>,
  additionalAddress?: string
): string[] {
  const reduce = fp.pipe(fp.compact);

  return reduce([
    additionalAddress,
    address.street?.startsWith(address.houseNumber ?? '')
      ? address.street
      : reduce([address.houseNumber, address.street]).join(' '),
    `${address.postalCode} ${address.city}`
  ]);
}
