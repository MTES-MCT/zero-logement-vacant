import {
  bundleCampaigns,
  Campaign,
  CampaignBundle,
  campaignStep,
  CampaignSteps
} from "../models/Campaign";
import { useSelector } from "react-redux";
import { ApplicationState } from "../store/reducers/applicationReducers";
import { useMemo } from "react";

export function useCampaignBundle(initialBundle?: CampaignBundle) {
  const {
    campaignBundle: defaultBundle,
    campaignList
  } = useSelector((state: ApplicationState) => state.campaign)
  const bundle = initialBundle ?? defaultBundle

  const campaigns = useMemo<Campaign[]>(() => {
    return bundle
      ? bundleCampaigns(campaignList ?? [], bundle)
      : []
  }, [bundle, campaignList])

  const main = useMemo<Campaign | null>(
    () => campaigns[0] ?? null,
    [campaigns]
  )

  const step = useMemo<CampaignSteps | null>(() => {
    return main ? campaignStep(main) : null
  }, [main])

  return {
    bundle,
    campaigns,
    mainCampaign: main,
    step
  }
}
