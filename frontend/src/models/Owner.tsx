import { HousingOwnerDTO, OwnerDTO } from '@zerologementvacant/models';
import { Address, fromAddressDTO, toOwnerAddressDTO } from './Address';
import fp from 'lodash/fp';

export interface DraftOwner {
  rawAddress: string[];
  fullName: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
  rank: number;
}

export interface Owner extends Omit<OwnerDTO, 'banAddress'> {
  banAddress?: Address;
}

export function fromOwnerDTO(owner: OwnerDTO): Owner {
  return {
    id: owner.id,
    rawAddress: owner.rawAddress,
    fullName: owner.fullName,
    administrator: owner.administrator,
    birthDate: owner.birthDate,
    email: owner.email,
    phone: owner.phone,
    kind: owner.kind,
    banAddress: owner.banAddress ? fromAddressDTO(owner.banAddress) : undefined,
    additionalAddress: owner.additionalAddress
  };
}

export function toOwnerDTO(owner: Owner): OwnerDTO {
  return {
    id: owner.id,
    rawAddress: owner.rawAddress,
    fullName: owner.fullName,
    administrator: owner.administrator,
    birthDate: owner.birthDate,
    email: owner.email,
    phone: owner.phone,
    kind: owner.kind,
    banAddress: owner.banAddress
      ? toOwnerAddressDTO(owner, owner.banAddress)
      : undefined,
    additionalAddress: owner.additionalAddress
  };
}

export interface HousingOwner extends HousingOwnerDTO {
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}

export function fromHousingOwnerDTO(
  housingOwner: HousingOwnerDTO
): HousingOwner {
  return {
    ...toOwnerDTO(housingOwner),
    rank: housingOwner.rank,
    idprocpte: housingOwner.idprocpte,
    idprodroit: housingOwner.idprodroit,
    locprop: housingOwner.locprop
  };
}

export const getHousingOwnerRankLabel = (rank: number) => {
  if (!rank) {
    rank = 0;
  }

  const labels = [
    { rank: 1, label: 'Propriétaire principal' },
    { rank: 0, label: 'Ancien propriétaire' },
    { rank: -1, label: 'Propriétaire incorrect' },
    {
      rank: -2,
      label:
        'Propriétaire doublon LOVAC 2024 - En attente de traitement par ZLV'
    },
    { rank: -3, label: 'Propriétaire décédé.e' }
  ];

  const label = labels.find((label) => label.rank === rank)?.label;
  return label ? label : `${rank}ème ayant droit`;
};

function compare(before: Owner, after: Owner): Partial<Owner> {
  return fp.pipe(
    fp.pick([
      'fullName',
      'birthDate',
      'email',
      'phone',
      'banAddress',
      'additionalAddress'
    ]),
    fp.pickBy(
      (value, key) => !fp.isEqual(value, after[key as keyof typeof value])
    )
  )(before);
}

export function hasOwnerChanges(before: Owner, after: Owner): boolean {
  return Object.keys(compare(before, after)).length > 0;
}

export function hasRankChanges(
  before: ReadonlyArray<HousingOwner>,
  after: ReadonlyArray<HousingOwner>
): boolean {
  return before.some((ownerBefore) => {
    const ownerAfter = after.find((owner) => owner.id === ownerBefore.id);
    return ownerAfter && ownerBefore.rank !== ownerAfter.rank;
  });
}
