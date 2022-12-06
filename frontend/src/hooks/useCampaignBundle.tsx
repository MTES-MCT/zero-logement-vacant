import {
  bundleCampaigns,
  Campaign,
  CampaignBundle, CampaignNumberSort,
  campaignStep,
  CampaignSteps,
} from '../models/Campaign';
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

  const reminders = useMemo<Campaign[] | null>(
    () => campaigns ? campaigns.filter(_ => _.reminderNumber > 0)  : null,
    [campaigns]
  )

  const step = useMemo<CampaignSteps | null>(() => {
    return main ? campaignStep(main) : null
  }, [main])

  const isLastReminder = useMemo<boolean>(() => {
    return bundle ?
       campaignList?.filter(_ => _.campaignNumber === bundle.campaignNumber)
            .sort(CampaignNumberSort)
            .reverse()[0]?.reminderNumber === Number(bundle.reminderNumber) : false
  }, [bundle])

  const isDeletable = useMemo<boolean>(() => {
    return bundle ?
        (bundle.campaignNumber ?? 0) > 0
        && (reminders?.length === 0 || isLastReminder)
        && step !== CampaignSteps.Archived : false
  }, [bundle])

  return {
    bundle,
    campaigns,
    mainCampaign: main,
    reminderCampaigns: reminders,
    isDeletable,
    step
  }
}
