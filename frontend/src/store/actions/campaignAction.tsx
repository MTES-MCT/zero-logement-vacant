import { Dispatch } from 'redux';
import { Campaign, CampaignFilters } from '../../models/Campaign';
import campaignService from '../../services/campaign.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';

export const FETCH_CAMPAIGN_LIST = 'FETCH_CAMPAIGN_LIST';
export const CAMPAIGN_LIST_FETCHED = 'CAMPAIGN_LIST_FETCHED';

export interface FetchCampaignListAction {
    type: typeof FETCH_CAMPAIGN_LIST,
    filters: CampaignFilters,
    search: string
}

export interface CampaignListFetchedAction {
    type: typeof CAMPAIGN_LIST_FETCHED,
    campaignList: Campaign[],
    filters: CampaignFilters,
    search: string
}

export type CampaignActionTypes = FetchCampaignListAction | CampaignListFetchedAction;

export const filterCampaign = (filters: CampaignFilters) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_CAMPAIGN_LIST,
            filters,
            search: getState().campaign.search
        });

        campaignService.listCampaigns(filters, getState().campaign.search)
            .then(campaignList => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_LIST_FETCHED,
                    campaignList,
                    filters,
                    search: getState().campaign.search
                });
            });
    };
};

export const searchCampaign = (search: string) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        if (search !== getState().campaign.search) {

            dispatch(showLoading());

            dispatch({
                type: FETCH_CAMPAIGN_LIST,
                filters: getState().campaign.filters,
                search
            });

            campaignService.listCampaigns(getState().campaign.filters, search)
                .then(campaignList => {
                    dispatch(hideLoading());
                    dispatch({
                        type: CAMPAIGN_LIST_FETCHED,
                        campaignList,
                        filters: getState().campaign.filters,
                        search
                    });
                });
        }
    };
};
