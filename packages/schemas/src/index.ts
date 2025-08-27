import { buildingFilters } from './building-filters';
import { campaignCreationPayload } from './campaign-creation-payload';
import { dateString } from './date-string';
import {
  draftCreationPayload,
  draftUpdatePayload,
  sender,
  signatory
} from './draft';
import { email } from './email';
import { establishmentFilters } from './establishment-filters';
import { fileUpload } from './file-upload';
import { geoCode } from './geo-code';
import { groupCreationPayload } from './group-creation-payload';
import { housingBatchUpdatePayload } from './housing-batch-update-payload';
import { housingFilters } from './housing-filters';
import { housingUpdatePayload } from './housing-update-payload';
import { id } from './id';
import { notePayload } from './note-payload';
import { password, passwordConfirmation } from './password';
import { siren } from './siren';

export { GEO_CODE_REGEXP } from './geo-code';
export { SIREN_REGEXP } from './siren';

const schemas = {
  buildingFilters,
  campaignCreationPayload,
  dateString,
  draftCreationPayload,
  draftUpdatePayload,
  email,
  establishmentFilters,
  fileUpload,
  geoCode,
  groupCreationPayload,
  housingBatchUpdatePayload,
  housingFilters,
  housingUpdatePayload,
  id,
  notePayload,
  password,
  passwordConfirmation,
  sender,
  signatory,
  siren
};

export default schemas;
