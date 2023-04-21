import _ from 'lodash';

import { Sort } from './SortApi';
import { HousingDTO } from '../../shared/models/HousingDTO';
import { HousingStatusApi } from './HousingStatusApi';

export type HousingApi = HousingDTO;

export interface HousingUpdateApi {
  status: HousingStatusApi;
  subStatus?: string;
  precisions?: string[];
  contactKind: string;
  vacancyReasons?: string[];
  comment: string;
}

export const isHousingUpdated = (
  housing: HousingApi,
  housingUpdate: HousingUpdateApi
) =>
  housing.status !== housingUpdate.status ||
  housing.subStatus !== housingUpdate.subStatus ||
  !_.isEqual(housing.precisions, housingUpdate.precisions) ||
  !_.isEqual(housing.vacancyReasons, housingUpdate.vacancyReasons) ||
  housingUpdate.comment?.length;

export type HousingSortableApi = Pick<HousingApi, 'owner' | 'rawAddress'>;
export type HousingSortApi = Sort<HousingSortableApi>;

export enum OwnershipKindsApi {
  Single = 'single',
  CoOwnership = 'co',
  Other = 'other',
}

export const getOwnershipKindFromValue = (value?: string) => {
  return !value
    ? OwnershipKindsApi.Single
    : OwnershipKindValues[OwnershipKindsApi.CoOwnership].indexOf(value) !== -1
    ? OwnershipKindsApi.CoOwnership
    : OwnershipKindValues[OwnershipKindsApi.Other].indexOf(value) !== -1
    ? OwnershipKindsApi.Other
    : undefined;
};

export const OwnershipKindValues = {
  [OwnershipKindsApi.CoOwnership]: ['CL'],
  [OwnershipKindsApi.Other]: ['BND', 'CLV', 'CV', 'MP', 'TF'],
};

export enum OccupancyKindApi {
  Vacant = 'V',
  Rent = 'L',
}

export enum EnergyConsumptionGradesApi {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
}
