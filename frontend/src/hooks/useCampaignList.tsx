import { useEffect } from 'react';
import { listCampaigns } from '../store/actions/campaignAction';
import { useAppDispatch, useAppSelector } from './useStore';

export const useCampaignList = (forceReload = false) => {
  const dispatch = useAppDispatch();
  const { campaignList } = useAppSelector((state) => state.campaign);

  useEffect(() => {
    if (forceReload || !campaignList) {
      dispatch(listCampaigns());
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  return campaignList;
};
