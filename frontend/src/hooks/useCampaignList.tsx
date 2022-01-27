import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { listCampaigns } from '../store/actions/campaignAction';

export const useCampaignList = () => {

    const dispatch = useDispatch();
    const { campaignList } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        if (!campaignList) {
            dispatch(listCampaigns())
        }
    }, [dispatch]);

    return campaignList;
}
