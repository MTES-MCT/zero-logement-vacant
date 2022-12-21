import {
  CampaignBundle,
  campaignStep,
  CampaignSteps,
  mainCampaign,
} from '../models/Campaign';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { useEffect } from 'react';
import { listCampaignBundles } from '../store/actions/campaignAction';
import { useCampaignList } from './useCampaignList';

export function useCampaignBundleList() {
  const dispatch = useDispatch();
  const campaignList = useCampaignList(true);

  const { campaignBundleList } = useSelector(
    (state: ApplicationState) => state.campaign
  );

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
