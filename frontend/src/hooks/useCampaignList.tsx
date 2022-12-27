import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { listCampaigns } from '../store/actions/campaignAction';

export const useCampaignList = (forceReload = false) => {
  const dispatch = useDispatch();
  const { campaignList } = useSelector(
    (state: ApplicationState) => state.campaign
  );

  useEffect(() => {
    if (forceReload || !campaignList) {
      dispatch(listCampaigns());
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  return campaignList;
};
