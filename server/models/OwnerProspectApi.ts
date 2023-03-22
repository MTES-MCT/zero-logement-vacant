import { Sort } from './SortApi';

export interface OwnerProspectApi {
  id: string;
  address: string;
  invariant?: string;
  geoCode: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
  callBack: boolean;
  read: boolean;
  createdAt: Date;
}

export type OwnerProspectSortableApi = Pick<
  OwnerProspectApi,
  'address' | 'email' | 'createdAt'
>;
export type OwnerProspectSortApi = Sort<OwnerProspectSortableApi>;

export type OwnerProspectUpdateApi = Pick<
  OwnerProspectApi,
  'callBack' | 'read'
>;
