import fp from 'lodash/fp';

export interface AddressDTO {
  refId: string;
  addressKind: AddressKinds;
  label: string;
  /**
   * @deprecated See {@link label}
   */
  houseNumber?: string;
  /**
   * @deprecated See {@link label}
   */
  street?: string;
  /**
   * @deprecated See {@link label}
   */
  postalCode: string;
  /**
   * @deprecated See {@link label}
   */
  city: string;
  latitude?: number;
  longitude?: number;
  score?: number;
}

export type AddressPayloadDTO = Pick<
  AddressDTO,
  | 'label'
  | 'houseNumber'
  | 'street'
  | 'postalCode'
  | 'city'
  | 'latitude'
  | 'longitude'
  | 'score'
>;

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
