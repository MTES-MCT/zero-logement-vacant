import { Dispatch } from 'redux';
import { Campaign } from '../../models/Campaign';
import campaignService from '../../services/campaign.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import housingService from '../../services/housing.service';

export const FETCH_CAMPAIGN_LIST = 'FETCH_CAMPAIGN_LIST';
export const CAMPAIGN_LIST_FETCHED = 'CAMPAIGN_LIST_FETCHED';
export const FETCH_CAMPAIGN_HOUSING_LIST = 'FETCH_CAMPAIGN_HOUSING_LIST';
export const CAMPAIGN_HOUSING_LIST_FETCHED = 'CAMPAIGN_HOUSING_LIST_FETCHED';

export interface FetchCampaignListAction {
    type: typeof FETCH_CAMPAIGN_LIST,
    search: string
}

export interface CampaignListFetchedAction {
    type: typeof CAMPAIGN_LIST_FETCHED,
    campaignList: Campaign[],
    search: string
}

export interface FetchCampaignHousingListAction {
    type: typeof FETCH_CAMPAIGN_HOUSING_LIST,
    campaignId: string
}

export interface CampaignHousingListFetchedAction {
    type: typeof CAMPAIGN_HOUSING_LIST_FETCHED,
    campaignId: string,
    campaignHousingList: Campaign[]
}

export type CampaignActionTypes = FetchCampaignListAction | CampaignListFetchedAction | FetchCampaignHousingListAction | CampaignHousingListFetchedAction;

export const searchCampaign = (search: string) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        if (search !== getState().campaign.search) {

            dispatch(showLoading());

            dispatch({
                type: FETCH_CAMPAIGN_LIST,
                search
            });

            campaignService.listCampaigns(search)
                .then(campaignList => {
                    dispatch(hideLoading());
                    dispatch({
                        type: CAMPAIGN_LIST_FETCHED,
                        campaignList,
                        search
                    });
                });
        }
    };
};

export const listCampaignHousing = (campaignId: string) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        if (campaignId !== getState().campaign.campaignId) {

            dispatch(showLoading());

            dispatch({
                type: FETCH_CAMPAIGN_HOUSING_LIST,
                campaignId
            });

            housingService.listByCampaign(campaignId)
                .then(campaignHousingList => {
                    dispatch(hideLoading());
                    dispatch({
                        type: CAMPAIGN_HOUSING_LIST_FETCHED,
                        campaignId,
                        campaignHousingList
                    });
                });
        }
    };
};
