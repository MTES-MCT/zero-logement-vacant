import { buildingFilters } from './building-filters';
import { campaignCreationPayload } from './campaign-creation-payload';
import { campaignUpdateNextPayload } from './campaign-update-next-payload';
import { dateString } from './date-string';
import { documentPayload } from './document-payload';
import { draft } from './draft';
import {
  draftCreationPayload,
  sender,
  signatory
} from './draft-creation-payload';
import { draftUpdatePayload } from './draft-update-payload';
import { email } from './email';
import { establishmentFilters } from './establishment-filters';
import { geoCode } from './geo-code';
import { groupCreationPayload } from './group-creation-payload';
import { groupHousingPayload } from './group-housing-payload';
import { housingBatchUpdatePayload } from './housing-batch-update-payload';
import { housingDocumentPayload } from './housing-document-payload';
import { housingFilters } from './housing-filters';
import { housingUpdatePayload } from './housing-update-payload';
import { id } from './id';
import { notePayload } from './note-payload';
import { ownerFilters } from './owner-filters';
import { ownerPayload } from './owner-payload';
import { pagination } from './pagination';
import { password, passwordConfirmation } from './password';
import { phone } from './phone';
import { signIn } from './sign-in';
import { siren } from './siren';
import { sort } from './sort';
import { userFilters } from './user-filters';
import { userUpdatePayload } from './user-update-payload';

const schemas = {
  buildingFilters,
  campaignCreationPayload,
  campaignUpdateNextPayload,
  dateString,
  documentPayload,
  draft,
  draftCreationPayload,
  draftUpdatePayload,
  email,
  establishmentFilters,
  geoCode,
  groupCreationPayload,
  groupHousingPayload,
  housingBatchUpdatePayload,
  housingDocumentPayload,
  housingFilters,
  housingUpdatePayload,
  id,
  notePayload,
  ownerFilters,
  ownerPayload,
  pagination,
  password,
  passwordConfirmation,
  phone,
  sender,
  signatory,
  signIn,
  siren,
  sort,
  userFilters,
  userUpdatePayload
};

export { GEO_CODE_REGEXP } from './geo-code';
export { type HousingDocumentPayload } from './housing-document-payload';
export { MAX_PER_PAGE } from './pagination';
export { PHONE_REGEXP } from './phone';
export { SIREN_REGEXP } from './siren';

export default schemas;
