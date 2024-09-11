import { reduceStringArray } from '../utils/stringUtils';
import config from '../utils/config';
import { AddressDTO, AddressKinds } from '@zerologementvacant/models';
import { Owner } from './Owner';
import fp from 'lodash/fp';

export type Address = Omit<AddressDTO, 'refId' | 'addressKind'>;

/**
 * @deprecated
 * @param address
 * @param breakLine
 */
export const addressToString = (address?: Address, breakLine = true) => {
  if (address) {
    return reduceStringArray(
      [
        address.street?.startsWith(address.houseNumber ?? '')
          ? address.street
          : [address.houseNumber, address.street].join(' '),
        [address.postalCode, address.city].join(' ')
      ],
      breakLine
    );
  }
};

export const isBanEligible = (address?: Pick<Address, 'score'>) => {
  return (
    address?.score !== undefined && address.score >= config.banEligibleScore
  );
};

export function fromAddressDTO(address: AddressDTO): Address {
  return fp.omit(['refId', 'addressKind'], address);
}

export function toOwnerAddressDTO(owner: Owner, address: Address): AddressDTO {
  return {
    ...address,
    refId: owner.id,
    addressKind: AddressKinds.Owner
  };
}
