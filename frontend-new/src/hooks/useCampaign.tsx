import { useParams } from 'react-router-dom';
import { useGetCampaignQuery } from '../services/campaign.service';
import { useMemo } from 'react';
import { campaignStep, CampaignSteps } from '../models/Campaign';

export function useCampaign() {
  const { campaignId } = useParams<{ campaignId: string }>();

  const { data: campaign } = useGetCampaignQuery(campaignId);

  const step = useMemo<CampaignSteps | null>(() => {
    return campaign ? campaignStep(campaign) : null;
  }, [campaign]);

  return {
    campaign,
    step,
  };
}
