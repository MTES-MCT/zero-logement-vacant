import {
  bundleCampaigns,
  Campaign,
  CampaignBundle,
  CampaignNumberSort,
  campaignStep,
  CampaignSteps,
} from '../models/Campaign';
import { useMemo } from 'react';
import { useAppSelector } from './useStore';

export function useCampaignBundle(initialBundle?: CampaignBundle) {
  const { campaignBundle: defaultBundle, campaignList } = useAppSelector(
    (state) => state.campaign
  );
  const bundle = initialBundle ?? defaultBundle;

  const campaigns = useMemo<Campaign[]>(() => {
    return bundle ? bundleCampaigns(campaignList ?? [], bundle) : [];
  }, [bundle, campaignList]);

  const main = useMemo<Campaign | null>(
    () => campaigns[0] ?? null,
    [campaigns]
  );

  const reminders = useMemo<Campaign[]>(
    () => (campaigns ? campaigns.filter((_) => _.reminderNumber > 0) : []),
    [campaigns]
  );

  const step = useMemo<CampaignSteps | null>(() => {
    return main ? campaignStep(main) : null;
  }, [main]);

  const hasReminders = useMemo<boolean>(() => {
    return reminders?.length !== 0;
  }, [reminders]);

  const isLastReminder = useMemo<(reminderNumber?: number) => boolean>(() => {
    return (reminderNumber?: number) => {
      return (
        !!bundle &&
        !!reminderNumber &&
        campaignList
          ?.filter((_) => _.campaignNumber === bundle.campaignNumber)
          .sort(CampaignNumberSort)
          .reverse()[0]?.reminderNumber === Number(reminderNumber)
      );
    };
  }, [bundle, campaignList]);

  const isCampaign = useMemo<boolean>(() => {
    return (
      !!bundle &&
      bundle.campaignNumber !== undefined &&
      bundle.campaignNumber > 0
    );
  }, [bundle]);

  const isDeletable = useMemo<boolean>(() => {
    return (
      !!bundle &&
      isCampaign &&
      (!hasReminders || isLastReminder(bundle.reminderNumber)) &&
      step !== CampaignSteps.Archived
    );
  }, [bundle]); //eslint-disable-line react-hooks/exhaustive-deps

  return {
    bundle,
    campaigns,
    mainCampaign: main,
    reminderCampaigns: reminders,
    isDeletable,
    isCampaign,
    hasReminders,
    isLastReminder,
    step,
  };
}
