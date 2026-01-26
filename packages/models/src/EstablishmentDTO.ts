import { EstablishmentKind } from './EstablishmentKind';
import { EstablishmentSource } from './EstablishmentSource';
import type { UserDTO } from './UserDTO';

export interface EstablishmentDTO {
  id: string;
  name: string;
  shortName: string;
  siren: string;
  available: boolean;
  geoCodes: string[];
  kind: EstablishmentKind;
  source: EstablishmentSource;
  /**
   * Filled only when the caller has the required permissions.
   */
  users?: UserDTO[];
}

export function isChild(geoCodes: ReadonlySet<string>) {
  return (establishment: Pick<EstablishmentDTO, 'geoCodes'>): boolean => {
    return establishment.geoCodes.some((geoCode) => geoCodes.has(geoCode));
  };
}

export function isDepartmentalEstablishment(
  establishment: Pick<EstablishmentDTO, 'kind'>
): boolean {
  const departments: ReadonlyArray<EstablishmentKind> = ['DEP', 'REG', 'TOM'];
  return departments.includes(establishment.kind);
}

export function isIntercommunalityEstablishment(
  establishment: Pick<EstablishmentDTO, 'kind'>
): boolean {
  const intercommunalities: ReadonlyArray<EstablishmentKind> = [
    'CA',
    'CC',
    'CU',
    'METRO',
    'EPT'
  ];
  return intercommunalities.includes(establishment.kind);
}
