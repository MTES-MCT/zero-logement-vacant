import {
  FindOptions,
  useFindCampaignsQuery
} from '../services/campaign.service';

export const useCampaignList = (opts?: FindOptions) => {
  const { data: campaignList, } = useFindCampaignsQuery(opts);

  return campaignList;
};
