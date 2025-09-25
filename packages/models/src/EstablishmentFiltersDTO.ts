import { EstablishmentDTO } from './EstablishmentDTO';

export type EstablishmentFiltersDTO = Partial<
  Pick<EstablishmentDTO, 'available' | 'geoCodes'>
> & {
  id?: EstablishmentDTO['id'][];
  name?: EstablishmentDTO['name'];
  kind?: EstablishmentDTO['kind'][];
  siren?: EstablishmentDTO['siren'][];
  /**
   * Filter on active establishments (having at least one user)
   */
  active?: boolean;
  query?: string;
};
