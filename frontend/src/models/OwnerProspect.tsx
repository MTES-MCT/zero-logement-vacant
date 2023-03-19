import { Sort } from './Sort';

export interface OwnerProspect {
  id?: string;
  address: string;
  invariant?: string;
  geoCode: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
  callBack: boolean;
  createdAt?: string;
}

export type OwnerProspectSortable = Pick<
  OwnerProspect,
  'address' | 'email' | 'createdAt'
>;
export type OwnerProspectSort = Sort<OwnerProspectSortable>;
