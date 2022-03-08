import { Dispatch } from 'redux';
import { Campaign, CampaignSteps, DraftCampaign } from '../../models/Campaign';
import campaignService from '../../services/campaign.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import { PaginatedResult } from '../../models/PaginatedResult';
import { HousingUpdate, Housing } from '../../models/Housing';
import { HousingStatus } from '../../models/HousingState';
import housingService from '../../services/housing.service';

export const FETCH_CAMPAIGN_LIST = 'FETCH_CAMPAIGN_LIST';
export const CAMPAIGN_LIST_FETCHED = 'CAMPAIGN_LIST_FETCHED';
export const FETCH_CAMPAIGN = 'FETCH_CAMPAIGN';
export const CAMPAIGN_FETCHED = 'CAMPAIGN_FETCHED';
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

export interface FetchCampaignAction {
    type: typeof FETCH_CAMPAIGN
    campaignFetchingId: string
}

export interface CampaignFetchedAction {
    type: typeof CAMPAIGN_FETCHED,
    campaign: Campaign[]
    campaignFetchingId: string
}

export interface FetchCampaignHousingListAction {
    type: typeof FETCH_CAMPAIGN_HOUSING_LIST,
    campaignHousingFetchingId: string,
    status: HousingStatus,
    page: number,
    perPage: number
}

export interface CampaignHousingListFetchedAction {
    type: typeof CAMPAIGN_HOUSING_LIST_FETCHED,
    campaignHousingFetchingId: string,
    status: HousingStatus,
    paginatedHousing: PaginatedResult<Housing>,
    exportURL: string
}

export interface CampaignCreatedAction {
    type: typeof CAMPAIGN_CREATED,
    campaignId: string
}

export interface CampaignUpdatedAction {
    type: typeof CAMPAIGN_UPDATED,
    campaign: Campaign
}

export type CampaignActionTypes =
    FetchCampaignListAction
    | CampaignListFetchedAction
    | FetchCampaignAction
    | CampaignFetchedAction
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

export const getCampaign = (campaignId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_CAMPAIGN,
            campaignFetchingId: campaignId
        });

        campaignService.getCampaign(campaignId)
            .then(campaign => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_FETCHED,
                    campaignFetchingId: campaignId,
                    campaign
                });
            });
    };
};

export const listCampaignHousing = (campaignId: string, status: HousingStatus) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const page = 1
        const perPage = getState().campaign.campaignHousingByStatus[status].perPage

        dispatch({
            type: FETCH_CAMPAIGN_HOUSING_LIST,
            campaignHousingFetchingId: campaignId,
            status,
            page,
            perPage,
        });

        housingService.listByCampaign(campaignId, page, perPage, status)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_HOUSING_LIST_FETCHED,
                    campaignHousingFetchingId: campaignId,
                    status,
                    paginatedHousing: result,
                    exportURL: campaignService.getExportURL(campaignId)
                });
            });
    };
};


export const changeCampaignHousingPagination = (page: number, perPage: number, status: HousingStatus) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        const campaignId = getState().campaign.campaign?.id

        if (campaignId) {

            dispatch(showLoading());

            dispatch({
                type: FETCH_CAMPAIGN_HOUSING_LIST,
                campaignHousingFetchingId: campaignId,
                status,
                page: page,
                perPage
            });

            housingService.listByCampaign(campaignId, page, perPage, status)
                .then((result: PaginatedResult<Housing>) => {
                    dispatch(hideLoading());
                    dispatch({
                        type: CAMPAIGN_HOUSING_LIST_FETCHED,
                        campaignHousingFetchingId: campaignId,
                        status,
                        paginatedHousing: result,
                        exportURL: campaignService.getExportURL(campaignId)
                    });
                });
        }
    };
};

export const createCampaign = (draftCampaign: DraftCampaign, allHousing: boolean, housingIds: string[]) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.createCampaign(draftCampaign, allHousing, housingIds)
            .then((campaignId) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_CREATED,
                    campaignId
                });
                listCampaigns()(dispatch)
            });
    };
};

export const createCampaignReminder = (campaign: Campaign, startMonth: string, allHousing: boolean, housingIds: string[]) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.createCampaignReminder(campaign, startMonth, allHousing, housingIds)
            .then((campaignId) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_CREATED,
                    campaignId
                });
                listCampaigns()(dispatch)
            });
    };
};

export const validCampaignStep = (campaignId: string, step: CampaignSteps, params?: {sendingDate?: Date}) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.validCampaignStep(campaignId, step, params)
            .then(campaign => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_UPDATED,
                    campaign
                });
            });
    };
};

export const updateCampaignHousingList = (housingUpdate: HousingUpdate, allHousing: boolean, housingIds: string[]) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        const campaignId = getState().campaign.campaign?.id

        if (campaignId && housingUpdate.previousStatus !== undefined) {

            const previousStatus = housingUpdate.previousStatus;

            dispatch(showLoading());

            const paginatedHousing = getState().campaign.campaignHousingByStatus[previousStatus];

            housingService.updateHousingList(housingUpdate, allHousing, housingIds)
                .then(() => {
                    dispatch(hideLoading());
                    changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, previousStatus)(dispatch, getState);
                    changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, housingUpdate.status)(dispatch, getState);
                    getCampaign(campaignId)(dispatch);
                });
        }

    }
}

export const removeCampaignHousingList = (campaignId: string, allHousing: boolean, housingIds: string[], currentStatus: HousingStatus) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const paginatedHousing = getState().campaign.campaignHousingByStatus[currentStatus];

        campaignService.removeHousingList(campaignId, allHousing, housingIds, currentStatus)
            .then(() => {
                dispatch(hideLoading());
                changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, currentStatus)(dispatch, getState);
                getCampaign(campaignId)(dispatch);
            });

    }
}

export const deleteCampaign = (campaignId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.deleteCampaign(campaignId)
            .then(() => {
                dispatch(hideLoading());
                listCampaigns()(dispatch)
            });

    }
}


