import { EstablishmentDTO } from './EstablishmentDTO';

export type EstablishmentFiltersDTO = Pick<
  EstablishmentDTO,
  'id' | 'available' | 'kind' | 'name' | 'geoCodes' | 'siren'
> & {
  query?: string;
};
