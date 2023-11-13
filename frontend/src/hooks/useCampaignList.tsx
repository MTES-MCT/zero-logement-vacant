import {
  ListCampaignsOptions,
  useFindCampaignsQuery,
} from '../services/campaign.service';

export const useCampaignList = (opts?: ListCampaignsOptions) => {
  const { data: campaignList } = useFindCampaignsQuery(opts);

  return campaignList;
};
