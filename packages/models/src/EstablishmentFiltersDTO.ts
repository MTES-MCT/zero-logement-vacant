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
  /**
   * Filter establishments that share at least one geo code
   * with the specified establishment
   */
  related?: EstablishmentDTO['id'];
};
