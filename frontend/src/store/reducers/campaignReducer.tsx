import {
  Campaign,
  CampaignBundle,
  CampaignBundleId,
} from '../../models/Campaign';
import {
  CampaignBundleFetchedAction,
  CampaignBundleListFetchedAction,
  CampaignCreatedAction,
  CampaignListFetchedAction,
  CampaignUpdatedAction,
  FetchCampaignBundleAction,
} from '../actions/campaignAction';
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';

export interface CampaignState {
  campaignList?: Campaign[];
  campaignBundleList?: CampaignBundle[];
  campaignBundle?: CampaignBundle;
  campaignBundleFetchingId?: CampaignBundleId;
  campaignIds?: string[];
  loading: boolean;
  campaignCreated: boolean;
  searchQuery?: string;
}

const initialState: CampaignState = {
  loading: false,
  campaignCreated: false,
};

const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    fetchCampaignList: (state: CampaignState) => {
      state.campaignList = undefined;
      state.loading = true;
    },
    campaignListFetched: (
      state: CampaignState,
      action: PayloadAction<CampaignListFetchedAction>
    ) => {
      state.campaignList = action.payload.campaignList;
      state.loading = false;
    },
    fetchCampaignBundleList: (state: CampaignState) => {
      state.campaignBundleList = undefined;
      state.loading = true;
    },
    campaignBundleListFetched: (
      state: CampaignState,
      action: PayloadAction<CampaignBundleListFetchedAction>
    ) => {
      state.campaignBundleList = action.payload.campaignBundleList;
      state.loading = false;
    },
    fetchCampaignBundle: (
      state: CampaignState,
      action: PayloadAction<FetchCampaignBundleAction>
    ) => {
      state.campaignBundleFetchingId = action.payload.campaignBundleFetchingId;
      state.campaignBundle =
        action.payload.campaignBundleFetchingId ===
        state.campaignBundleFetchingId
          ? state.campaignBundle
          : undefined;
      state.loading = true;
      state.campaignCreated = false;
    },
    campaignBundleFetched: (
      state: CampaignState,
      action: PayloadAction<CampaignBundleFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.campaignBundleFetchingId ===
        current(state).campaignBundleFetchingId;
      if (isCurrentFetching) {
        state.campaignBundle = action.payload.campaignBundle;
        state.loading = false;
      }
    },
    campaignCreated: (
      state: CampaignState,
      action: PayloadAction<CampaignCreatedAction>
    ) => {
      state.campaignBundleFetchingId = action.payload.campaignBundleFetchingId;
      state.campaignBundle = undefined;
      state.campaignCreated = true;
    },
    campaignUpdated: (
      state: CampaignState,
      action: PayloadAction<CampaignUpdatedAction>
    ) => {
      state.campaignBundleFetchingId = action.payload.campaignBundleFetchingId;
    },
  },
});

export default campaignSlice;
