import type {
  BaseHousingOwnerDTO,
  HousingOwnerDTO,
  OwnerDTO
} from '@zerologementvacant/models';
import { contramap, DEFAULT_ORDER, type Ord } from '@zerologementvacant/utils';
import { isEqual, pick, pickBy } from 'lodash-es';
import { type Address } from './Address';

export interface DraftOwner {
  rawAddress: string[];
  fullName: string;
  birthDate?: Date;
  email?: string;
  phone?: string;
  rank: number;
}

export interface Owner extends Omit<OwnerDTO, 'banAddress'> {
  banAddress: Address | null;
}

export function fromOwnerDTO(owner: OwnerDTO): Owner {
  return {
    id: owner.id,
    idpersonne: owner.idpersonne,
    rawAddress: owner.rawAddress,
    fullName: owner.fullName,
    administrator: owner.administrator,
    birthDate: owner.birthDate,
    email: owner.email,
    phone: owner.phone,
    kind: owner.kind,
    kindDetail: owner.kindDetail,
    siren: owner.siren,
    banAddress: owner.banAddress,
    additionalAddress: owner.additionalAddress,
    createdAt: owner.createdAt,
    updatedAt: owner.updatedAt
  };
}

export function toOwnerDTO(owner: Owner): OwnerDTO {
  return {
    id: owner.id,
    idpersonne: owner.idpersonne,
    rawAddress: owner.rawAddress,
    fullName: owner.fullName,
    administrator: owner.administrator,
    birthDate: owner.birthDate,
    email: owner.email,
    phone: owner.phone,
    kind: owner.kind,
    kindDetail: owner.kindDetail,
    siren: owner.siren,
    banAddress: owner.banAddress ?? null,
    additionalAddress: owner.additionalAddress,
    createdAt: owner.createdAt,
    updatedAt: owner.updatedAt
  };
}

export interface HousingOwner extends BaseHousingOwnerDTO, Owner {
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}

export function fromHousingOwnerDTO(
  housingOwner: HousingOwnerDTO
): HousingOwner {
  return {
    ...fromOwnerDTO(housingOwner),
    rank: housingOwner.rank,
    idprocpte: housingOwner.idprocpte,
    idprodroit: housingOwner.idprodroit,
    locprop: housingOwner.locprop,
    relativeLocation: housingOwner.relativeLocation,
    absoluteDistance: housingOwner.absoluteDistance,
    propertyRight: housingOwner.propertyRight
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
  const keys: ReadonlyArray<keyof Owner> = [
    'fullName',
    'birthDate',
    'email',
    'phone',
    'banAddress',
    'additionalAddress'
  ];
  return pickBy(
    pick(before, keys),
    (value, key) => !isEqual(value, after[key as keyof typeof value])
  );
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

export const byRank: Ord<HousingOwner> = contramap(
  (housingOwner: HousingOwner) => housingOwner.rank
)(DEFAULT_ORDER);
