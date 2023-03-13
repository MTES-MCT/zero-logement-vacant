import { listCampaignBundleHousing } from '../store/actions/campaignAction';
import { CampaignBundle } from '../models/Campaign';
import { useAppDispatch } from './useStore';

export type SearchFn = (query: string) => void;

export function useCampaignHousingSearch() {
  const dispatch = useAppDispatch();

  function search(bundle: CampaignBundle) {
    return (query: string): void => {
      dispatch(listCampaignBundleHousing(bundle, undefined, query));
    };
  }

  return {
    search,
  };
}
