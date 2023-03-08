import {
  CampaignBundle,
  campaignStep,
  CampaignSteps,
  mainCampaign,
} from '../models/Campaign';
import { useEffect } from 'react';
import { listCampaignBundles } from '../store/actions/campaignAction';
import { useCampaignList } from './useCampaignList';
import { useAppDispatch, useAppSelector } from './useStore';

export function useCampaignBundleList() {
  const dispatch = useAppDispatch();
  const campaignList = useCampaignList(true);

  const { campaignBundleList } = useAppSelector((state) => state.campaign);

  useEffect(() => {
    dispatch(listCampaignBundles());
  }, [dispatch]);

  const mainCampaignOfBundle = mainCampaign(campaignList ?? []);

  const campaignBundleStep = (bundle: CampaignBundle): CampaignSteps | null => {
    const main = mainCampaignOfBundle(bundle);
    return main ? campaignStep(main) : null;
  };

  const stepsFilter =
    (steps: CampaignSteps[]) => (campaignBundle: CampaignBundle) =>
      steps.find((step) => campaignBundleStep(campaignBundle) === step);

  const campaignBundlesCount = (steps: CampaignSteps[]) =>
    campaignBundleList?.filter(stepsFilter(steps)).length ?? 0;

  return {
    campaignBundleList,
    stepsFilter,
    campaignBundlesCount,
  };
}
