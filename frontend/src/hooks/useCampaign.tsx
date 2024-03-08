import { useParams } from 'react-router-dom';
import { useGetCampaignQuery } from '../services/campaign.service';
import { useMemo } from 'react';
import { campaignStep, CampaignSteps } from '../models/Campaign';
import { useFindDraftsQuery } from '../services/draft.service';

export function useCampaign() {
  const { id } = useParams<{ id: string }>();

  const { data: campaign, isLoading: isLoadingCampaign } =
    useGetCampaignQuery(id);
  const { data: drafts, isLoading: isLoadingDraft } = useFindDraftsQuery({
    campaign: id,
  });

  const step = useMemo<CampaignSteps | null>(() => {
    return campaign ? campaignStep(campaign) : null;
  }, [campaign]);

  return {
    campaign,
    draft: drafts?.[0],
    isLoadingCampaign,
    isLoadingDraft,
    step,
  };
}
