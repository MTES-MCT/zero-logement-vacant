import { OwnerDTO, OwnerPayloadDTO } from '../../shared';
import { compare } from '../utils/compareUtils';
import fp from 'lodash/fp';

export interface OwnerPayloadApi extends Omit<OwnerPayloadDTO, 'birthDate'> {
  birthDate?: Date;
}

export type OwnerApi = OwnerDTO;

export function fromOwnerPayloadDTO(payload: OwnerPayloadDTO): OwnerPayloadApi {
  return {
    ...fp.pick(
      [
        'rawAddress',
        'fullName',
        'email',
        'phone',
        'banAddress',
        'additionalAddress',
      ],
      payload
    ),
    birthDate: payload.birthDate ? new Date(payload.birthDate) : undefined,
  };
}

export function hasIdentityChanges(prev: OwnerApi, curr: OwnerApi): boolean {
  return (
    Object.values(compare(prev, curr, ['fullName', 'birthDate'])).length > 0
  );
}

export function hasContactChanges(prev: OwnerApi, curr: OwnerApi): boolean {
  return (
    Object.values(
      compare(prev, curr, ['rawAddress', 'email', 'phone', 'additionalAddress'])
    ).length > 0 ||
    Object.values(
      compare(prev.banAddress ?? {}, curr.banAddress ?? {}, [
        'city',
        'street',
        'houseNumber',
        'postalCode',
      ])
    ).length > 0
  );
}
