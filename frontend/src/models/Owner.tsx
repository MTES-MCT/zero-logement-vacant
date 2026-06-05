import type {
  BaseHousingOwnerDTO,
  HousingOwnerDTO,
  OwnerDTO
} from '@zerologementvacant/models';

import { type Address } from './Address';

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
    siren: owner.siren,
    username: owner.username,
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
    siren: owner.siren,
    username: owner.username,
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
