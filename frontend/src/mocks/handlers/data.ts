import { faker } from '@faker-js/faker';

import {
  CampaignDTO,
  DatafoncierHousing,
  DraftDTO,
  genCampaignDTO,
  genDatafoncierHousingDTO,
  genDraftDTO,
  genGroupDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO,
  genUserDTO,
  GroupDTO,
  HousingDTO,
  HousingOwnerDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';
import { EventDTO } from '@zerologementvacant/models/dist/EventDTO';

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

const campaignDrafts = new Map<CampaignDTO['id'], DraftDTO[]>(
  campaigns.map((campaign, i) => {
    const draft = drafts[i];
    return [campaign.id, [draft]];
  })
);
const draftCampaigns = new Map<DraftDTO['id'], CampaignDTO>(
  drafts.map((draft, i) => {
    const campaign = campaigns[i];
    return [draft.id, campaign];
  })
);

const campaignHousings = new Map<CampaignDTO['id'], HousingDTO[]>(
  campaigns.map((campaign) => {
    const elements = faker.helpers.arrayElements(housings);
    return [campaign.id, elements];
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

const groupHousings = new Map<GroupDTO['id'], HousingDTO[]>();

const housingOwners = new Map<HousingDTO['id'], HousingOwnerDTO[]>(
  housings.map((housing) => {
    const elements = faker.helpers.arrayElements(owners);
    const housingOwners: HousingOwnerDTO[] = elements.map((owner, i) => ({
      ...owner,
      rank: i + 1,
      idprocpte: null,
      idprodroit: null,
      locprop: null
    }));
    return [housing.id, housingOwners];
  })
);

const housingEvents = new Map<HousingDTO['id'], EventDTO<HousingDTO>[]>();

const data = {
  campaigns,
  campaignDrafts,
  campaignHousings,
  datafoncierHousings,
  drafts,
  draftCampaigns,
  groups,
  groupHousings,
  housings,
  housingCampaigns,
  housingEvents,
  housingOwners,
  owners,
  users
};

export default data;
