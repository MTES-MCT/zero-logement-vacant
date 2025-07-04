import { AddressDTO, AddressKinds } from '@zerologementvacant/models';
import { Struct } from 'effect';
import config from '../utils/config';
import { Owner } from './Owner';

export type Address = Omit<AddressDTO, 'refId' | 'addressKind' | 'cityCode'>;

export const isBanEligible = (address?: Pick<Address, 'score'>) => {
  return (
    address?.score !== undefined && address.score >= config.banEligibleScore
  );
};

export function fromAddressDTO(address: AddressDTO): Address {
  return Struct.omit(address, 'refId', 'addressKind');
}

export function toOwnerAddressDTO(owner: Owner, address: Address): AddressDTO {
  return {
    ...address,
    refId: owner.id,
    addressKind: AddressKinds.Owner
  };
}
