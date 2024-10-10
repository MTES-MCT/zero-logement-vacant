import { EstablishmentKind } from '@zerologementvacant/models';

export interface EstablishmentFilterApi {
  ids?: string[];
  available?: boolean;
  query?: string;
  geoCodes?: string[];
  kind?: EstablishmentKind;
  name?: string;
  sirens?: number[];
}
