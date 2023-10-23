import { OwnerDTO, OwnerPayloadDTO } from '../../shared';
import { compare } from '../utils/compareUtils';
import fp from 'lodash/fp';
import { parse } from 'date-fns';

export interface OwnerPayloadApi extends Omit<OwnerPayloadDTO, 'birthDate'> {
  birthDate?: Date;
}

export type OwnerApi = OwnerDTO;

export function fromOwnerPayloadDTO(payload: OwnerPayloadDTO): OwnerPayloadApi {
  return {
    ...fp.pick(['rawAddress', 'fullName', 'email', 'phone'], payload),
    birthDate: payload.birthDate
      ? parse(payload.birthDate, 'yyyy-MM-dd', new Date())
      : undefined,
  };
}

export function hasIdentityChanges(prev: OwnerApi, curr: OwnerApi): boolean {
  return (
    Object.values(compare(prev, curr, ['fullName', 'birthDate'])).length > 0
  );
}

export function hasContactChanges(prev: OwnerApi, curr: OwnerApi): boolean {
  return (
    Object.values(compare(prev, curr, ['rawAddress', 'email', 'phone']))
      .length > 0
  );
}
