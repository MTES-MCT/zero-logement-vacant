import {
  OwnerDTO,
  OwnerEntity,
  OwnerPayloadDTO
} from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { compare } from '~/utils/compareUtils';

export interface OwnerPayloadApi extends Omit<OwnerPayloadDTO, 'birthDate'> {
  birthDate?: Date;
}

export interface OwnerApi extends OwnerDTO {
  idpersonne?: string;
  siren?: string;
  dataSource?: string;
  entity: OwnerEntity | null;
}

export function toOwnerDTO(owner: OwnerApi): OwnerDTO {
  return {
    ...fp.pick(
      [
        'id',
        'rawAddress',
        'fullName',
        'administrator',
        'email',
        'phone',
        'banAddress',
        'additionalAddress',
        'kind',
        'kindDetail',
        'createdAt',
        'updatedAt'
      ],
      owner
    ),
    birthDate: owner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null
  };
}

export function fromOwnerPayloadDTO(payload: OwnerPayloadDTO): OwnerPayloadApi {
  return {
    ...fp.pick(
      [
        'rawAddress',
        'fullName',
        'email',
        'phone',
        'banAddress',
        'additionalAddress'
      ],
      payload
    ),
    birthDate: payload.birthDate ? new Date(payload.birthDate) : undefined
  };
}

export function hasIdentityChanges(prev: OwnerApi, curr: OwnerApi): boolean {
  return (
    Object.values(compare(prev, curr, ['fullName', 'birthDate'])).length > 0
  );
}

export function hasContactChanges(prev: OwnerApi, curr: OwnerApi): boolean {
  const emptyAddress = {
    city: '',
    street: '',
    houseNumber: '',
    postalCode: ''
  };

  return (
    Object.values(
      compare(prev, curr, ['rawAddress', 'email', 'phone', 'additionalAddress'])
    ).length > 0 ||
    Object.values(
      compare(
        prev.banAddress ?? emptyAddress,
        curr.banAddress ?? emptyAddress,
        ['city', 'street', 'houseNumber', 'postalCode']
      )
    ).length > 0
  );
}
