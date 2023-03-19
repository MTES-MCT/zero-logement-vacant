import { Dispatch } from 'redux';
import {
  Campaign,
  CampaignBundle,
  CampaignBundleId,
  CampaignKinds,
  CampaignSteps,
  DraftCampaign,
  getCampaignBundleId,
} from '../../models/Campaign';
import campaignService, {
  ValidateCampaignStepParams,
} from '../../services/campaign.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing, HousingSort, HousingUpdate } from '../../models/Housing';
import { HousingStatus } from '../../models/HousingState';
import housingService from '../../services/housing.service';
import { PaginationApi } from '../../../../server/models/PaginationApi';
import campaignSlice from '../reducers/campaignReducer';
import { AppState } from '../store';
import { Pagination } from '../../../../shared/models/Pagination';

export interface CampaignListFetchedAction {
  campaignList: Campaign[];
}

export interface CampaignBundleListFetchedAction {
  campaignBundleList: CampaignBundle[];
}

export interface FetchCampaignBundleAction {
  campaignBundleFetchingId: CampaignBundleId;
  searchQuery?: string;
}

export interface CampaignBundleFetchedAction {
  campaignBundle: CampaignBundle;
  campaignBundleFetchingId: CampaignBundleId;
  searchQuery?: string;
}

export interface FetchCampaignBundleHousingListAction {
  campaignIds: string[];
  status?: HousingStatus;
  page: number;
  perPage: number;
}

export interface CampaignBundleHousingListFetchedAction {
  campaignIds: string[];
  status?: HousingStatus;
  paginatedHousing: PaginatedResult<Housing>;
}

export interface CampaignCreatedAction {
  campaignBundleFetchingId?: CampaignBundleId;
}

export interface CampaignUpdatedAction {
  campaignBundleFetchingId?: CampaignBundleId;
}

const {
  campaignUpdated,
  campaignCreated,
  campaignBundleListFetched,
  campaignBundleHousingListFetched,
  fetchCampaignBundle,
  campaignBundleFetched,
  campaignListFetched,
  fetchCampaignBundleHousingList,
  fetchCampaignBundleList,
  fetchCampaignList,
} = campaignSlice.actions;

export const listCampaigns = () => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    if (!getState().campaign.loading) {
      dispatch(showLoading());

      dispatch(fetchCampaignList());

      campaignService.listCampaigns().then((campaignList) => {
        dispatch(hideLoading());
        dispatch(
          campaignListFetched({
            campaignList,
          })
        );
      });
    }
  };
};

export const listCampaignBundles = () => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchCampaignBundleList());

    campaignService.listCampaignBundles().then((campaignBundleList) => {
      dispatch(hideLoading());
      dispatch(
        campaignBundleListFetched({
          campaignBundleList,
        })
      );
    });
  };
};

export const getCampaignBundle = (
  campaignBundleId: CampaignBundleId,
  searchQuery?: string
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(
      fetchCampaignBundle({
        campaignBundleFetchingId: campaignBundleId,
        searchQuery,
      })
    );

    campaignService
      .getCampaignBundle(campaignBundleId, searchQuery)
      .then((campaignBundle) => {
        dispatch(hideLoading());
        dispatch(
          campaignBundleFetched({
            campaignBundleFetchingId: campaignBundleId,
            campaignBundle,
            searchQuery,
          })
        );
      });
  };
};

export const listCampaignBundleHousing = (
  campaignBundle: CampaignBundle,
  status?: HousingStatus,
  query?: string
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const page = 1;
    const perPage = (
      status
        ? getState().campaign.campaignBundleHousingByStatus[status]
        : getState().campaign.campaignBundleHousing
    ).perPage;

    dispatch(
      fetchCampaignBundleHousingList({
        campaignIds: campaignBundle.campaignIds,
        status,
        page,
        perPage,
      })
    );

    const filters = {
      campaignIds: campaignBundle.campaignIds,
      status: status ? [status] : [],
    };

    housingService
      .listHousing({ ...filters, query }, filters, {
        pagination: { page, perPage },
      })
      .then((result: PaginatedResult<Housing>) => {
        dispatch(hideLoading());
        dispatch(
          campaignBundleHousingListFetched({
            campaignIds: campaignBundle.campaignIds,
            status,
            paginatedHousing: result,
          })
        );
      });
  };
};

export const changeCampaignHousingPagination = (
  page: number,
  perPage: number,
  status?: HousingStatus
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    const campaignBundle = getState().campaign.campaignBundle;
    const searchQuery = getState().campaign.searchQuery;

    if (campaignBundle) {
      dispatch(showLoading());

      dispatch(
        fetchCampaignBundleHousingList({
          campaignIds: campaignBundle.campaignIds,
          status,
          page,
          perPage,
        })
      );

      const filters = {
        campaignIds: campaignBundle.campaignIds,
        status: status ? [status] : [],
      };

      housingService
        .listHousing({ ...filters, query: searchQuery }, filters, {
          pagination: {
            page,
            perPage,
          },
        })
        .then((result: PaginatedResult<Housing>) => {
          dispatch(hideLoading());
          dispatch(
            campaignBundleHousingListFetched({
              campaignIds: campaignBundle.campaignIds,
              status,
              paginatedHousing: result,
            })
          );
        });
    }
  };
};

export const changeCampaignHousingSort = (
  sort: HousingSort,
  status?: HousingStatus
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    const { campaignBundle, searchQuery, campaignBundleHousing } =
      getState().campaign;

    if (campaignBundle) {
      dispatch(showLoading());

      const pagination: Pagination = {
        page: 1,
        perPage: campaignBundleHousing.perPage,
      };

      dispatch(
        fetchCampaignBundleHousingList({
          campaignIds: campaignBundle.campaignIds,
          status,
          page: 1,
          perPage: campaignBundleHousing.perPage,
        })
      );

      const filters = {
        campaignIds: campaignBundle.campaignIds,
        status: status ? [status] : [],
      };

      housingService
        .listHousing({ ...filters, query: searchQuery }, filters, {
          pagination,
          sort,
        })
        .then((result: PaginatedResult<Housing>) => {
          dispatch(hideLoading());
          dispatch(
            campaignBundleHousingListFetched({
              campaignIds: campaignBundle.campaignIds,
              status,
              paginatedHousing: result,
            })
          );
        });
    }
  };
};

export const createCampaign = (
  draftCampaign: DraftCampaign,
  allHousing: boolean,
  housingIds: string[]
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    campaignService
      .createCampaign(draftCampaign, allHousing, housingIds)
      .then((campaign) => {
        dispatch(hideLoading());
        dispatch(
          campaignCreated({
            campaignBundleFetchingId: getCampaignBundleId(campaign),
          })
        );
        listCampaigns()(dispatch, getState);
      });
  };
};

export const createCampaignBundleReminder = (
  kind: CampaignKinds,
  allHousing: boolean,
  housingIds: string[]
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    const campaignBundleId = getCampaignBundleId(
      getState().campaign.campaignBundle
    );

    if (campaignBundleId) {
      dispatch(showLoading());

      campaignService
        .createCampaignBundleReminder(
          campaignBundleId,
          kind,
          allHousing,
          housingIds
        )
        .then((campaign) => {
          dispatch(hideLoading());
          dispatch(
            campaignCreated({
              campaignBundleFetchingId: getCampaignBundleId(campaign),
            })
          );
          listCampaigns()(dispatch, getState);
        });
    }
  };
};

export const updateCampaignBundleTitle = (
  campaignBundleId: CampaignBundleId,
  title?: string
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    campaignService
      .updateCampaignBundleTitle(campaignBundleId, title)
      .then(() => {
        dispatch(hideLoading());
        dispatch(
          campaignUpdated({
            campaignBundleFetchingId: campaignBundleId,
          })
        );
        if (getState().campaign.campaignBundle) {
          getCampaignBundle(
            getState().campaign.campaignBundle as CampaignBundleId,
            getState().campaign.searchQuery
          )(dispatch);
        }
        if (getState().campaign.campaignList) {
          listCampaignBundles()(dispatch);
        }
      });
  };
};

export const validCampaignStep = (
  campaignId: string,
  step: CampaignSteps,
  params?: ValidateCampaignStepParams
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    campaignService
      .validCampaignStep(campaignId, step, params)
      .then((campaign) => {
        dispatch(hideLoading());
        dispatch(
          campaignUpdated({
            campaignBundleFetchingId: getCampaignBundleId(campaign),
          })
        );
        listCampaigns()(dispatch, getState);
      });
  };
};

export const updateCampaignHousingList = (
  housingUpdate: HousingUpdate,
  currentStatus: HousingStatus,
  allHousing: boolean,
  housingIds: string[]
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    const campaignIds = getState().campaign.campaignBundle?.campaignIds;
    const searchQuery = getState().campaign.searchQuery;

    if (campaignIds && currentStatus) {
      dispatch(showLoading());

      const paginatedHousing =
        getState().campaign.campaignBundleHousingByStatus[currentStatus];
      const campaignBundleFetchingId =
        getState().campaign.campaignBundleFetchingId;

      housingService
        .updateHousingList(
          housingUpdate,
          campaignIds,
          allHousing,
          housingIds,
          currentStatus,
          searchQuery
        )
        .then(() => {
          dispatch(hideLoading());
          changeCampaignHousingPagination(
            paginatedHousing.page,
            paginatedHousing.perPage,
            currentStatus
          )(dispatch, getState);
          changeCampaignHousingPagination(
            paginatedHousing.page,
            paginatedHousing.perPage,
            housingUpdate.status
          )(dispatch, getState);
          if (campaignBundleFetchingId) {
            getCampaignBundle(campaignBundleFetchingId, searchQuery)(dispatch);
          }
        });
    }
  };
};

export const removeCampaignHousingList = (
  campaignId: string,
  allHousing: boolean,
  housingIds: string[],
  currentStatus?: HousingStatus
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const paginatedHousing = currentStatus
      ? getState().campaign.campaignBundleHousingByStatus[currentStatus]
      : getState().campaign.campaignBundleHousing;
    const campaignBundleFetchingId =
      getState().campaign.campaignBundleFetchingId;

    campaignService
      .removeHousingList(campaignId, allHousing, housingIds, currentStatus)
      .then(() => {
        dispatch(hideLoading());
        changeCampaignHousingPagination(
          paginatedHousing.page,
          paginatedHousing.perPage,
          currentStatus
        )(dispatch, getState);
        if (campaignBundleFetchingId) {
          getCampaignBundle(campaignBundleFetchingId)(dispatch);
        }
      });
  };
};

export const deleteCampaignBundle = (campaignBundleId: CampaignBundleId) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    campaignService.deleteCampaignBundle(campaignBundleId).then(() => {
      dispatch(hideLoading());
      listCampaigns()(dispatch, getState);
      listCampaignBundles()(dispatch);
    });
  };
};
