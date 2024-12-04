import { EstablishmentDTO, EstablishmentKind } from '@zerologementvacant/models';
import { normalizeUrlSegment } from '../utils/fetchUtils';

export interface Establishment extends Omit<EstablishmentDTO, 'siren'> {
  siren: number;
  available: boolean;
  geoCodes: string[];
  kind: EstablishmentKind;
}

export function fromEstablishmentDTO(
  establishment: EstablishmentDTO
): Establishment {
  return {
    ...establishment,
    siren: Number(establishment.siren)
  };
}

export function toEstablishmentDTO(
  establishment: Establishment
): EstablishmentDTO {
  return {
    ...establishment,
    siren: String(establishment.siren)
  };
}

export const getEstablishmentUrl = (establishment: Establishment) =>
  establishment.kind === 'Commune'
    ? `/communes/${normalizeUrlSegment(establishment.shortName)}-${
        establishment.geoCodes[0]
      }`
    : `/collectivites/${normalizeUrlSegment(establishment.shortName)}`;
