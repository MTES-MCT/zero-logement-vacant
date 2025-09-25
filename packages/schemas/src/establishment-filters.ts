import { array, boolean, object, ObjectSchema, string } from 'yup';

import {
  ESTABLISHMENT_KIND_VALUES,
  EstablishmentFiltersDTO
} from '@zerologementvacant/models';
import { geoCode } from './geo-code';
import { siren } from './siren';
import { commaSeparatedString } from './transforms';

export const establishmentFilters: ObjectSchema<EstablishmentFiltersDTO> = object({
  id: array().transform(commaSeparatedString).of(string().uuid().required()),
  available: boolean(),
  active: boolean(),
  name: string().trim(),
  geoCodes: array().transform(commaSeparatedString).of(geoCode.required()),
  kind: array()
    .transform(commaSeparatedString)
    .of(string().oneOf(ESTABLISHMENT_KIND_VALUES).required()),
  siren: array().transform(commaSeparatedString).of(siren.required()),
  query: string().trim()
});
