import { Dispatch } from 'redux';
import { Campaign, CampaignSteps, DraftCampaign } from '../../models/Campaign';
import campaignService from '../../services/campaign.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import housingService from '../../services/housing.service';
import { ApplicationState } from '../reducers/applicationReducers';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';

export const FETCH_CAMPAIGN_LIST = 'FETCH_CAMPAIGN_LIST';
export const CAMPAIGN_LIST_FETCHED = 'CAMPAIGN_LIST_FETCHED';
export const FETCH_CAMPAIGN_HOUSING_LIST = 'FETCH_CAMPAIGN_HOUSING_LIST';
export const CAMPAIGN_HOUSING_LIST_FETCHED = 'CAMPAIGN_HOUSING_LIST_FETCHED';
export const CAMPAIGN_CREATED = 'CAMPAIGN_CREATED';
export const CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED';

export interface FetchCampaignListAction {
    type: typeof FETCH_CAMPAIGN_LIST
}

export interface CampaignListFetchedAction {
    type: typeof CAMPAIGN_LIST_FETCHED,
    campaignList: Campaign[]
}

export interface FetchCampaignHousingListAction {
    type: typeof FETCH_CAMPAIGN_HOUSING_LIST,
    campaignId: string,
    page: number,
    perPage: number
}

export interface CampaignHousingListFetchedAction {
    type: typeof CAMPAIGN_HOUSING_LIST_FETCHED,
    campaignId: string,
    paginatedHousing: PaginatedResult<Housing>,
    exportURL: string
}

export interface CampaignCreatedAction {
    type: typeof CAMPAIGN_CREATED,
    campaign: Campaign
}

export interface CampaignUpdatedAction {
    type: typeof CAMPAIGN_UPDATED,
    campaign: Campaign
}

export type CampaignActionTypes =
    FetchCampaignListAction
    | CampaignListFetchedAction
    | FetchCampaignHousingListAction
    | CampaignHousingListFetchedAction
    | CampaignCreatedAction
    | CampaignUpdatedAction;

export const listCampaigns = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_CAMPAIGN_LIST
        });

        campaignService.listCampaigns()
            .then(campaignList => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_LIST_FETCHED,
                    campaignList
                });
            });
    };
};

export const listCampaignHousing = (campaignId: string) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const page = 1
        const perPage = getState().campaign.paginatedHousing.perPage

        dispatch({
            type: FETCH_CAMPAIGN_HOUSING_LIST,
            campaignId,
            page,
            perPage,
        });


        housingService.listByCampaign(campaignId, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_HOUSING_LIST_FETCHED,
                    campaignId,
                    paginatedHousing: result,
                    exportURL: campaignService.getExportURL(campaignId)
                });
            });
    };
};


export const changeCampaignHousingPagination = (page: number, perPage: number) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const campaignId = getState().campaign.campaignId

        dispatch({
            type: FETCH_CAMPAIGN_HOUSING_LIST,
            campaignId,
            page: page,
            perPage
        });

        housingService.listByCampaign(campaignId, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_HOUSING_LIST_FETCHED,
                    campaignId,
                    paginatedHousing: result
                });
            });
    };
};


export const createCampaign = (draftCampaign: DraftCampaign, allHousing: boolean, housingIds: string[]) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.createCampaign(draftCampaign, allHousing, housingIds)
            .then((campaign) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_CREATED,
                    campaign
                });
            });
    };
};

export const validCampaignStep = (campaignId: string, step: CampaignSteps) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.validCampaignStep(campaignId, step)
            .then(campaign => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_UPDATED,
                    campaign
                });
            });
    };
};
