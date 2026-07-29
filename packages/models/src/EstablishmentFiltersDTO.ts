import { EstablishmentDTO } from './EstablishmentDTO';

export type EstablishmentFiltersDTO = Partial<
  Pick<EstablishmentDTO, 'available' | 'geoCodes'>
> & {
  id?: EstablishmentDTO['id'][];
  name?: EstablishmentDTO['name'];
  kind?: EstablishmentDTO['kind'][];
  /**
   * Filter by the raw administrative kind imported from the Gold source.
   *
   * This vocabulary is intentionally open because Gold administrative-service
   * codes can evolve. Values are limited to 50 characters by the import and
   * database column.
   */
  kindAdmin?: string[];
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
