import { faker } from '@faker-js/faker';

import {
  CampaignDTO,
  DraftDTO,
  genCampaignDTO,
  genDraftDTO,
  genGroupDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO,
  genUserDTO,
  GroupDTO,
  HousingDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';

const campaigns: CampaignDTO[] = Array.from({ length: 10 }, genCampaignDTO);

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

interface CampaignDraft {
  campaignId: string;
  draftId: string;
}
const campaignDrafts = new Set<CampaignDraft>(
  campaigns.map((campaign, i) => {
    const draft = drafts[i];
    return {
      campaignId: campaign.id,
      draftId: draft.id
    };
  })
);

interface CampaignHousing {
  campaignId: string;
  housingId: string;
}
const campaignHousings = new Set<CampaignHousing>(
  campaigns.flatMap((campaign) => {
    const elements = faker.helpers.arrayElements(housings);
    return elements.map((element) => ({
      campaignId: campaign.id,
      housingId: element.id
    }));
  })
);

interface GroupHousing {
  groupId: string;
  housingId: string;
}
const groupHousings = new Set<GroupHousing>(
  groups.flatMap((group) => {
    const elements = faker.helpers.arrayElements(housings);
    return elements.map((element) => ({
      groupId: group.id,
      housingId: element.id
    }));
  })
);

const data = {
  campaigns,
  campaignDrafts,
  campaignHousings,
  drafts,
  groups,
  groupHousings,
  housings,
  owners,
  users
};

export default data;
