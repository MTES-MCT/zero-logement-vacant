import { isDefined, isNotNull } from '@zerologementvacant/utils';

import { AddressDTO, AddressPayloadDTO, formatAddress } from './AddressDTO';

export interface OwnerDTO {
  id: string;
  idpersonne: string | null;
  rawAddress: string[] | null;
  fullName: string;
  administrator: string | null;
  /**
   * A date formatted like yyyy-mm-dd
   */
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  banAddress: AddressDTO | null;
  additionalAddress: string | null;
  kind: string | null;
  siren: string | null;
  username: string | null;
  /**
   * Whether this owner refused to be contacted. When true, the owner must not
   * be contacted for any of their housings, whatever the establishment.
   */
  doNotContact: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type OwnerCreationPayload = Pick<
  OwnerDTO,
  'fullName' | 'birthDate' | 'email' | 'phone' | 'rawAddress'
>;

export type OwnerUpdatePayload = Pick<
  OwnerDTO,
  'fullName' | 'birthDate' | 'email' | 'phone' | 'additionalAddress'
> & {
  banAddress: AddressPayloadDTO | null;
  // Always sent so PUT /owners/{id} stays idempotent: callers that do not
  // touch it must send the owner's existing value.
  doNotContact: boolean;
};

export function getOwnerDisplayName(
  owner: Pick<OwnerDTO, 'fullName' | 'username'>
): string {
  return owner.username ?? owner.fullName;
}

export function getAddress(
  owner: Pick<OwnerDTO, 'banAddress' | 'additionalAddress' | 'rawAddress'>
): string[] {
  if (owner.banAddress) {
    return formatAddress(owner.banAddress, owner.additionalAddress);
  }

  return [owner.additionalAddress, owner.rawAddress]
    .filter(isNotNull)
    .filter(isDefined)
    .flat();
}
