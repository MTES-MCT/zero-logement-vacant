import { EstablishmentKind } from './EstablishmentKind';
import { EstablishmentSource } from './EstablishmentSource';

export interface EstablishmentDTO {
  id: string;
  name: string;
  shortName: string;
  siren: string;
  available: boolean;
  geoCodes: string[];
  kind: EstablishmentKind;
  source: EstablishmentSource;
}

export function isDepartmentalEstablishment(
  establishment: Pick<EstablishmentDTO, 'kind'>
): boolean {
  const departments: ReadonlyArray<EstablishmentKind> = [
    'DEP',
    'SDED',
    'SDER',
    'SIVOM',
    'REG',
    'CTU'
  ];
  return departments.includes(establishment.kind);
}

export function isIntercommunalityEstablishment(
  establishment: Pick<EstablishmentDTO, 'kind'>
): boolean {
  const intercommunalities: ReadonlyArray<EstablishmentKind> = [
    'CA',
    'CC',
    'CU',
    'ME'
  ];
  return intercommunalities.includes(establishment.kind);
}
