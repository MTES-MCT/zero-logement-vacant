import { buildingFilters } from './building-filters';
import { campaignCreationPayload } from './campaign-creation-payload';
import { dateString } from './date-string';
import { documentPayload } from './document-payload';
import { draft } from './draft';
import { email } from './email';
import { establishmentFilters } from './establishment-filters';
import { geoCode } from './geo-code';
import { groupCreationPayload } from './group-creation-payload';
import { housingBatchUpdatePayload } from './housing-batch-update-payload';
import { housingFilters } from './housing-filters';
import { housingUpdatePayload } from './housing-update-payload';
import { id } from './id';
import { notePayload } from './note-payload';
import { ownerFilters } from './owner-filters';
import { password, passwordConfirmation } from './password';
import { siren } from './siren';
import { userFilters } from './user-filters';
import { userUpdatePayload } from './user-update-payload';

export { GEO_CODE_REGEXP } from './geo-code';
export { SIREN_REGEXP } from './siren';

const schemas = {
  buildingFilters,
  campaignCreationPayload,
  dateString,
  documentPayload,
  draft,
  email,
  establishmentFilters,
  geoCode,
  groupCreationPayload,
  housingBatchUpdatePayload,
  housingFilters,
  housingUpdatePayload,
  id,
  notePayload,
  ownerFilters,
  password,
  passwordConfirmation,
  siren,
  userFilters,
  userUpdatePayload
};

export default schemas;
