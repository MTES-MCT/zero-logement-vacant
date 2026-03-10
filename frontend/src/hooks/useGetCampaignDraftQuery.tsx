import type { CampaignDTO } from '@zerologementvacant/models';
import { useFindDraftsQuery } from '~/services/draft.service';

/**
 * Get a draft by campaign, if it exists.
 * A campaign can only have one draft.
 * @param campaignId
 */
export function useGetCampaignDraftQuery(campaignId: CampaignDTO['id']) {
  return useFindDraftsQuery(
    { campaign: campaignId },
    {
      selectFromResult: ({ currentData, data, ...rest }) => ({
        ...rest,
        // Get the first draft if it exists, otherwise return undefined
        currentData: currentData?.at(0) ? currentData.at(0) : undefined,
        data: data?.at(0) ? data.at(0) : undefined
      })
    }
  );
}
