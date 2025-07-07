import { faker } from '@faker-js/faker/locale/fr';

import {
  BaseHousingOwnerDTO,
  CampaignDTO,
  DatafoncierHousing,
  DraftDTO,
  EstablishmentDTO,
  EventUnionDTO,
  GroupDTO,
  HousingDTO,
  NoteDTO,
  OwnerDTO,
  OwnerRank,
  Precision,
  PRECISION_CATEGORY_VALUES,
  PROPERTY_RIGHT_VALUES,
  ProspectDTO,
  SignupLinkDTO,
  UserDTO
} from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genDatafoncierHousingDTO,
  genDraftDTO,
  genGroupDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';

const campaigns: CampaignDTO[] = Array.from({ length: 10 }, genCampaignDTO);

const datafoncierHousings: DatafoncierHousing[] = Array.from(
  { length: 10 },
  () => genDatafoncierHousingDTO()
);

const drafts: DraftDTO[] = campaigns.map<DraftDTO>(() =>
  genDraftDTO(genSenderDTO())
);

const users: UserDTO[] = Array.from({ length: 10 }, () => genUserDTO());

const groups: GroupDTO[] = Array.from({ length: 5 }, () =>
  genGroupDTO(faker.helpers.arrayElement(users))
);

const owners: OwnerDTO[] = Array.from({ length: 30 }, genOwnerDTO);

const housings: HousingDTO[] = Array.from({ length: 20 }).map(() =>
  genHousingDTO(faker.helpers.arrayElement(owners))
);

const campaignDrafts = new Map<
  CampaignDTO['id'],
  ReadonlyArray<Pick<DraftDTO, 'id'>>
>(
  campaigns.map((campaign, i) => {
    const draft = drafts[i];
    return [campaign.id, [{ id: draft.id }]];
  })
);
const draftCampaigns = new Map<DraftDTO['id'], Pick<CampaignDTO, 'id'>>(
  drafts.map((draft, i) => {
    const campaign = campaigns[i];
    return [draft.id, { id: campaign.id }];
  })
);

const campaignHousings = new Map<
  CampaignDTO['id'],
  ReadonlyArray<Pick<HousingDTO, 'id'>>
>(
  campaigns.map((campaign) => {
    const elements = faker.helpers.arrayElements(housings);
    return [campaign.id, elements.map((housing) => ({ id: housing.id }))];
  })
);
const housingCampaigns = new Map<HousingDTO['id'], CampaignDTO[]>();
Array.from(campaignHousings.entries()).forEach(([campaignId, housings]) => {
  const campaign = campaigns.find((campaign) => campaign.id === campaignId);
  if (campaign) {
    housings.forEach((housing) => {
      const campaigns = housingCampaigns.get(housing.id) || [];
      campaigns.push(campaign);
      housingCampaigns.set(housing.id, campaigns);
    });
  }
});

const groupHousings = new Map<
  GroupDTO['id'],
  ReadonlyArray<Pick<HousingDTO, 'id'>>
>();

const housingOwners = new Map<
  HousingDTO['id'],
  ReadonlyArray<BaseHousingOwnerDTO & Pick<OwnerDTO, 'id'>>
>(
  housings.map((housing) => {
    const elements = faker.helpers.arrayElements(owners);
    const housingOwners = elements.map((owner, i) => ({
      id: owner.id,
      rank: (i + 1) as OwnerRank,
      idprocpte: null,
      idprodroit: null,
      locprop: faker.number.int(1),
      propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
    }));
    return [housing.id, housingOwners];
  })
);

const precisions: Precision[] = PRECISION_CATEGORY_VALUES.map((category) => ({
  id: faker.string.uuid(),
  category: category,
  label: faker.word.sample()
}));

const housingEvents = new Map<
  HousingDTO['id'],
  EventUnionDTO<
    'housing:created' | 'housing:occupancy-updated' | 'housing:status-updated'
  >[]
>();

const notes: NoteDTO[] = [];
const housingNotes = new Map<HousingDTO['id'], string[]>();

const prospects: ProspectDTO[] = [];

const signupLinks: SignupLinkDTO[] = [];

const establishments: EstablishmentDTO[] = [];

const data = {
  campaigns,
  campaignDrafts,
  campaignHousings,
  datafoncierHousings,
  drafts,
  draftCampaigns,
  establishments,
  groups,
  groupHousings,
  housings,
  housingCampaigns,
  housingEvents,
  housingNotes,
  housingOwners,
  notes,
  owners,
  precisions,
  prospects,
  signupLinks,
  users
};

export default data;
