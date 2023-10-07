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
import campaignSlice from '../reducers/campaignReducer';
import { AppState } from '../store';
import { HousingFilters } from '../../models/HousingFilters';
import { Group } from '../../models/Group';

export interface CampaignListFetchedAction {
  campaignList: Campaign[];
}

export interface CampaignBundleListFetchedAction {
  campaignBundleList: CampaignBundle[];
}

export interface FetchCampaignBundleAction {
  campaignBundleFetchingId: CampaignBundleId;
}

export interface CampaignBundleFetchedAction {
  campaignBundle: CampaignBundle;
  campaignBundleFetchingId: CampaignBundleId;
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
  fetchCampaignBundle,
  campaignBundleFetched,
  campaignListFetched,
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
          })
        );
      });
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

interface CampaignFromGroupPayload {
  campaign: Pick<Campaign, 'title'>;
  group: Group;
}

export const createCampaignFromGroup = (payload: CampaignFromGroupPayload) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    return campaignService
      .createCampaignFromGroup(payload)
      .then((campaign) => {
        campaignCreated({
          campaignBundleFetchingId: getCampaignBundleId(campaign),
        });
        return campaign;
      })
      .finally(() => {
        dispatch(hideLoading());
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

export const removeCampaignHousingList = (
  campaignId: string,
  allHousing: boolean,
  housingIds: string[],
  filters: HousingFilters
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const campaignBundleFetchingId =
      getState().campaign.campaignBundleFetchingId;

    campaignService
      .removeHousingList(campaignId, allHousing, housingIds, filters)
      .then(() => {
        dispatch(hideLoading());
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
