import { AddressDTO, AddressPayloadDTO, formatAddress } from './AddressDTO';

export interface OwnerDTO {
  id: string;
  rawAddress: string[];
  fullName: string;
  administrator?: string;
  /**
   * A date formatted like yyyy-mm-dd
   */
  birthDate?: string;
  email?: string;
  phone?: string;
  banAddress?: AddressDTO;
  additionalAddress?: string;
  kind?: string;
  kindDetail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OwnerPayloadDTO = Pick<
  OwnerDTO,
  | 'rawAddress'
  | 'fullName'
  | 'birthDate'
  | 'email'
  | 'phone'
  | 'additionalAddress'
> & {
  banAddress?: AddressPayloadDTO;
};

export function getAddress(owner: OwnerDTO): string[] {
  if (owner.banAddress) {
    return formatAddress(owner.banAddress, owner.additionalAddress);
  }

  return !owner.additionalAddress
    ? owner.rawAddress
    : [owner.additionalAddress, ...owner.rawAddress];
}
