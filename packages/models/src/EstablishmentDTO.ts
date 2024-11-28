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
