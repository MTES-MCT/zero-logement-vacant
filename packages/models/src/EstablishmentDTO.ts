import { EstablishmentKind } from './EstablishmentKind';
import { EstablishmentSource } from './EstablishmentSource';

export interface EstablishmentDTO {
  id: string;
  name: string;
  shortName: string;
  siren: number;
  available: boolean;
  geoCodes: ReadonlyArray<string>;
  kind: EstablishmentKind;
  source: EstablishmentSource;
}
