import { OwnerDTO, OwnerPayloadDTO } from '@zerologementvacant/models';
import { compare } from '~/utils/compareUtils';
import fp from 'lodash/fp';

export interface OwnerPayloadApi extends Omit<OwnerPayloadDTO, 'birthDate'> {
  birthDate?: Date;
}

export interface OwnerApi extends OwnerDTO {
  idpersonne?: string;
  siren?: string;
  dataSource?: string;
  createdAt?: string;
  updatedAt?: string;
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
