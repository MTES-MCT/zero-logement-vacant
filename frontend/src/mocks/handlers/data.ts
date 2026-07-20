import { faker } from '@faker-js/faker/locale/fr';
import {
  type BaseHousingOwnerDTO,
  type BuildingDTO,
  type CampaignDTO,
  type DatafoncierHousing,
  type DocumentDTO,
  type DraftDTO,
  type EstablishmentDTO,
  type EventUnionDTO,
  type FileUploadDTO,
  type GroupDTO,
  type HousingDTO,
  type LocalityDTO,
  type NoteDTO,
  type OwnerDTO,
  type Precision,
  PRECISION_CATEGORY_VALUES,
  type ProspectDTO,
  type SignupLinkDTO,
  type UserDTO
} from '@zerologementvacant/models';

const buildings: BuildingDTO[] = [];

const campaigns: CampaignDTO[] = [];
const campaignDocuments = new Map<
  CampaignDTO['id'],
  ReadonlyArray<Pick<DocumentDTO, 'id'>>
>();
const campaignDrafts = new Map<
  CampaignDTO['id'],
  ReadonlyArray<Pick<DraftDTO, 'id'>>
>();
const campaignHousings = new Map<
  CampaignDTO['id'],
  ReadonlyArray<Pick<HousingDTO, 'id'>>
>();

const datafoncierHousings: DatafoncierHousing[] = [];

const documents = new Map<DocumentDTO['id'], DocumentDTO>();

const drafts: DraftDTO[] = [];
const draftCampaigns = new Map<DraftDTO['id'], Pick<CampaignDTO, 'id'>>();

const establishments: EstablishmentDTO[] = [];

const files: FileUploadDTO[] = [];

const groups: GroupDTO[] = [];
const groupHousings = new Map<
  GroupDTO['id'],
  ReadonlyArray<Pick<HousingDTO, 'id'>>
>();

const owners: OwnerDTO[] = [];

const housings: HousingDTO[] = [];
const housingCampaigns = new Map<
  HousingDTO['id'],
  ReadonlyArray<Pick<CampaignDTO, 'id'>>
>();
const housingDocuments = new Map<
  HousingDTO['id'],
  ReadonlyArray<Pick<DocumentDTO, 'id'>>
>();
const housingEvents = new Map<
  HousingDTO['id'],
  EventUnionDTO<
    'housing:created' | 'housing:occupancy-updated' | 'housing:status-updated'
  >[]
>();
const housingFiles = new Map<HousingDTO['id'], FileUploadDTO[]>();
const housingNotes = new Map<HousingDTO['id'], string[]>();
const housingOwners = new Map<
  HousingDTO['id'],
  ReadonlyArray<BaseHousingOwnerDTO & Pick<OwnerDTO, 'id'>>
>();
const housingPrecisions = new Map<
  HousingDTO['id'],
  ReadonlyArray<Precision['id']>
>();

const localities = new Map<LocalityDTO['geoCode'], LocalityDTO>();

const notes: NoteDTO[] = [];

const precisions: Precision[] = PRECISION_CATEGORY_VALUES.map((category) => ({
  id: faker.string.uuid(),
  category: category,
  label: faker.word.sample()
}));

const prospects: ProspectDTO[] = [];

const signupLinks: SignupLinkDTO[] = [];

const users: UserDTO[] = [];
const authSession: {
  userId: UserDTO['id'] | null;
  establishmentId: EstablishmentDTO['id'] | null;
} = {
  userId: null,
  establishmentId: null
};

function reset(): void {
  buildings.length = 0;
  campaigns.length = 0;
  campaignDrafts.clear();
  campaignHousings.clear();
  datafoncierHousings.length = 0;
  drafts.length = 0;
  draftCampaigns.clear();
  establishments.length = 0;
  groups.length = 0;
  groupHousings.clear();
  housings.length = 0;
  housingCampaigns.clear();
  housingEvents.clear();
  housingNotes.clear();
  housingOwners.clear();
  housingPrecisions.clear();
  localities.clear();
  notes.length = 0;
  owners.length = 0;
  prospects.length = 0;
  signupLinks.length = 0;
  users.length = 0;
  authSession.userId = null;
  authSession.establishmentId = null;
}

// Export immediately to avoid Vite SSR module wrapping
export default {
  buildings,
  campaigns,
  campaignDocuments,
  campaignDrafts,
  campaignHousings,
  datafoncierHousings,
  documents,
  drafts,
  draftCampaigns,
  establishments,
  files,
  groups,
  groupHousings,
  housings,
  housingCampaigns,
  housingDocuments,
  housingEvents,
  housingFiles,
  housingNotes,
  housingOwners,
  housingPrecisions,
  localities,
  notes,
  owners,
  precisions,
  prospects,
  signupLinks,
  users,
  authSession,

  reset
};
