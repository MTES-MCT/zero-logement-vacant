import { useDispatch } from 'react-redux';
import { listCampaignBundleHousing } from '../store/actions/campaignAction';
import { CampaignBundle } from '../models/Campaign';

export type SearchFn = (query: string) => void;

export function useCampaignHousingSearch() {
  const dispatch = useDispatch();

  function search(bundle: CampaignBundle) {
    return (query: string): void => {
      dispatch(listCampaignBundleHousing(bundle, undefined, query));
    };
  }

  return {
    search,
  };
}
