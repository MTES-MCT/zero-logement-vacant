import type { EstablishmentDTO } from '@zerologementvacant/models';

export interface Establishment extends Omit<EstablishmentDTO, 'siren'> {
  siren: number;
}

export function fromEstablishmentDTO(
  establishment: EstablishmentDTO
): Establishment {
  return {
    ...establishment,
    siren: Number(establishment.siren)
  };
}
