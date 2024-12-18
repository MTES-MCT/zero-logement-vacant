import { dateString } from './date-string';
import { draft } from './draft';
import { email } from './email';
import { establishmentFilters } from './establishment-filters';
import { geoCode } from './geo-code';
import { housingFilters } from './housing-filters';
import { password, passwordConfirmation } from './password';
import { siren } from './siren';

export { GEO_CODE_REGEXP } from './geo-code';
export { SIREN_REGEXP } from './siren';

export const schemas = {
  dateString,
  draft,
  email,
  establishmentFilters,
  geoCode,
  housingFilters,
  password,
  passwordConfirmation,
  siren
};

export default schemas;
