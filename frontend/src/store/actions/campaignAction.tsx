import { Dispatch } from 'redux';
import {
    Campaign,
    CampaignBundle,
    CampaignBundleId,
    CampaignSteps,
    DraftCampaign,
    getCampaignBundleId,
} from '../../models/Campaign';
import campaignService from '../../services/campaign.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing, HousingUpdate } from '../../models/Housing';
import { HousingStatus } from '../../models/HousingState';
import housingService from '../../services/housing.service';

export const FETCH_CAMPAIGN_LIST = 'FETCH_CAMPAIGN_LIST';
export const CAMPAIGN_LIST_FETCHED = 'CAMPAIGN_LIST_FETCHED';
export const FETCH_CAMPAIGN_BUNDLE_LIST = 'FETCH_CAMPAIGN_BUNDLE_LIST';
export const CAMPAIGN_BUNDLE_LIST_FETCHED = 'CAMPAIGN_BUNDLE_LIST_FETCHED';
export const FETCH_CAMPAIGN_BUNDLE = 'FETCH_CAMPAIGN_BUNDLE';
export const CAMPAIGN_BUNDLE_FETCHED = 'CAMPAIGN_BUNDLE_FETCHED';
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
export interface FetchCampaignBundleListAction {
    type: typeof FETCH_CAMPAIGN_BUNDLE_LIST
}

export interface CampaignBundleListFetchedAction {
    type: typeof CAMPAIGN_BUNDLE_LIST_FETCHED,
    campaignBundleList: CampaignBundle[]
}

export interface FetchCampaignAction {
    type: typeof FETCH_CAMPAIGN_BUNDLE
    campaignBundleFetchingId: CampaignBundleId
}

export interface CampaignBundleFetchedAction {
    type: typeof CAMPAIGN_BUNDLE_FETCHED,
    campaignBundle: Campaign[]
    campaignBundleFetchingId: CampaignBundleId
}

export interface FetchCampaignHousingListAction {
    type: typeof FETCH_CAMPAIGN_HOUSING_LIST,
    campaignHousingFetchingIds: string[],
    status: HousingStatus,
    page: number,
    perPage: number
}

export interface CampaignHousingListFetchedAction {
    type: typeof CAMPAIGN_HOUSING_LIST_FETCHED,
    campaignHousingFetchingIds: string[],
    status: HousingStatus,
    paginatedHousing: PaginatedResult<Housing>,
    exportURL: string
}

export interface CampaignCreatedAction {
    type: typeof CAMPAIGN_CREATED,
    campaignBundleFetchingId: CampaignBundleId
}

export interface CampaignUpdatedAction {
    type: typeof CAMPAIGN_UPDATED,
    campaignBundleFetchingId: CampaignBundleId
}

export type CampaignActionTypes =
    FetchCampaignListAction
    | CampaignListFetchedAction
    | FetchCampaignBundleListAction
    | CampaignBundleListFetchedAction
    | FetchCampaignAction
    | CampaignBundleFetchedAction
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
            .then((campaignList) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_LIST_FETCHED,
                    campaignList
                });
            });
    };
};

export const listCampaignBundles = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_CAMPAIGN_BUNDLE_LIST
        });

        campaignService.listCampaignBundles()
            .then(campaignBundleList => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_BUNDLE_LIST_FETCHED,
                    campaignBundleList
                });
            });
    };
};

export const getCampaignBundle = (campaignBundleId: CampaignBundleId) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_CAMPAIGN_BUNDLE,
            campaignBundleFetchingId: campaignBundleId
        });

        campaignService.getCampaignBundle(campaignBundleId)
            .then(campaignBundle => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_BUNDLE_FETCHED,
                    campaignBundleFetchingId: campaignBundleId,
                    campaignBundle
                });
            });
    };
};

export const listCampaignBundleHousing = (campaignBundle: CampaignBundle, status: HousingStatus) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const page = 1
        const perPage = getState().campaign.campaignBundleHousingByStatus[status].perPage

        dispatch({
            type: FETCH_CAMPAIGN_HOUSING_LIST,
            campaignHousingFetchingIds: campaignBundle.campaignIds,
            status,
            page,
            perPage,
        });

        housingService.listHousing({campaignIds: campaignBundle.campaignIds, status: [status]}, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: CAMPAIGN_HOUSING_LIST_FETCHED,
                    campaignHousingFetchingIds: campaignBundle.campaignIds,
                    status,
                    paginatedHousing: result,
                    exportURL: campaignService.getExportURL(campaignBundle as CampaignBundleId)
                });
            });
    };
};


export const changeCampaignHousingPagination = (page: number, perPage: number, status: HousingStatus) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        const campaignBundle = getState().campaign.campaignBundle

        if (campaignBundle) {

            dispatch(showLoading());

            dispatch({
                type: FETCH_CAMPAIGN_HOUSING_LIST,
                campaignHousingFetchingIds: campaignBundle.campaignIds,
                status,
                page: page,
                perPage
            });

            housingService.listHousing({campaignIds: campaignBundle.campaignIds, status: [status]}, page, perPage)
                .then((result: PaginatedResult<Housing>) => {
                    dispatch(hideLoading());
                    dispatch({
                        type: CAMPAIGN_HOUSING_LIST_FETCHED,
                        campaignHousingFetchingIds: campaignBundle.campaignIds,
                        status,
                        paginatedHousing: result,
                        exportURL: campaignService.getExportURL(campaignBundle)
                    });
                });
        }
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
                    campaignBundleFetchingId: getCampaignBundleId(campaign)
                });
                listCampaigns()(dispatch)
            });
    };
};

export const createCampaignBundleReminder = (startMonth: string, allHousing: boolean, housingIds: string[]) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        const campaignBundle = getState().campaign.campaignBundle

        if (campaignBundle) {

            dispatch(showLoading());

            campaignService.createCampaignBundleReminder(getCampaignBundleId(campaignBundle), startMonth, allHousing, housingIds)
                .then((campaign) => {
                    dispatch(hideLoading());
                    dispatch({
                        type: CAMPAIGN_CREATED,
                        campaignBundleFetchingId: getCampaignBundleId(campaign)
                    });
                    listCampaigns()(dispatch)
                });

        }
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
                    campaignBundleFetchingId: getCampaignBundleId(campaign)
                });
                listCampaigns()(dispatch)
            });
    };
};

export const updateCampaignHousingList = (housingUpdate: HousingUpdate, currentStatus: HousingStatus, allHousing: boolean, housingIds: string[]) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        const campaignIds = getState().campaign.campaignBundle?.campaignIds

        if (campaignIds && currentStatus) {

            dispatch(showLoading());

            const paginatedHousing = getState().campaign.campaignBundleHousingByStatus[currentStatus];
            const campaignBundleFetchingId = getState().campaign.campaignBundleFetchingId;

            housingService.updateHousingList(housingUpdate, campaignIds, allHousing, housingIds, currentStatus)
                .then(() => {
                    dispatch(hideLoading());
                    changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, currentStatus)(dispatch, getState);
                    changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, housingUpdate.status)(dispatch, getState);
                    if (campaignBundleFetchingId) {
                        getCampaignBundle(campaignBundleFetchingId)(dispatch);
                    }
                });
        }

    }
}

export const removeCampaignHousingList = (campaignId: string, allHousing: boolean, housingIds: string[], currentStatus: HousingStatus) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const paginatedHousing = getState().campaign.campaignBundleHousingByStatus[currentStatus];
        const campaignBundleFetchingId = getState().campaign.campaignBundleFetchingId;

        campaignService.removeHousingList(campaignId, allHousing, housingIds, currentStatus)
            .then(() => {
                dispatch(hideLoading());
                changeCampaignHousingPagination(paginatedHousing.page, paginatedHousing.perPage, currentStatus)(dispatch, getState);
                if (campaignBundleFetchingId) {
                    getCampaignBundle(campaignBundleFetchingId)(dispatch);
                }
            });

    }
}

export const deleteCampaignBundle = (campaignNumber: number) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        campaignService.deleteCampaignBundle(campaignNumber)
            .then(() => {
                dispatch(hideLoading());
                listCampaigns()(dispatch)
                listCampaignBundles()(dispatch)
            });

    }
}


