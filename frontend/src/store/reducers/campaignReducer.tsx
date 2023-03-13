import {
  Campaign,
  CampaignBundle,
  CampaignBundleId,
} from '../../models/Campaign';
import {
  CampaignBundleFetchedAction,
  CampaignBundleHousingListFetchedAction,
  CampaignBundleListFetchedAction,
  CampaignCreatedAction,
  CampaignListFetchedAction,
  CampaignUpdatedAction,
  FetchCampaignBundleAction,
  FetchCampaignBundleHousingListAction,
} from '../actions/campaignAction';
import {
  initialPaginatedResult,
  PaginatedResult,
} from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';

export interface CampaignState {
  campaignList?: Campaign[];
  campaignBundleList?: CampaignBundle[];
  campaignBundle?: CampaignBundle;
  campaignBundleFetchingId?: CampaignBundleId;
  campaignBundleHousingByStatus: PaginatedResult<Housing>[];
  campaignBundleHousing: PaginatedResult<Housing>;
  campaignIds?: string[];
  loading: boolean;
  campaignCreated: boolean;
  searchQuery?: string;
}

const initialState: CampaignState = {
  campaignBundleHousingByStatus: [
    initialPaginatedResult(),
    initialPaginatedResult(),
    initialPaginatedResult(),
    initialPaginatedResult(),
    initialPaginatedResult(),
    initialPaginatedResult(),
    initialPaginatedResult(),
  ],
  campaignBundleHousing: initialPaginatedResult(),
  loading: false,
  campaignCreated: false,
};

const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    fetchCampaignList: (state: CampaignState) => {
      state.campaignList = [];
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
      state.campaignBundleList = [];
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
      state.searchQuery = action.payload.searchQuery;
    },
    campaignBundleFetched: (
      state: CampaignState,
      action: PayloadAction<CampaignBundleFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.campaignBundleFetchingId ===
          current(state).campaignBundleFetchingId &&
        action.payload.searchQuery === current(state).searchQuery;
      if (isCurrentFetching) {
        state.campaignBundle = action.payload.campaignBundle;
        state.loading = false;
      }
    },
    fetchCampaignBundleHousingList: (
      state: CampaignState,
      action: PayloadAction<FetchCampaignBundleHousingListAction>
    ) => {
      state.campaignIds = action.payload.campaignIds;
      state.campaignBundleHousingByStatus = action.payload.status
        ? [
            ...state.campaignBundleHousingByStatus.filter(
              (_, index) => index < action.payload.status!
            ),
            {
              entities: [],
              totalCount: 0,
              filteredCount: 0,
              page: action.payload.page,
              perPage: action.payload.perPage,
              loading: true,
            },
            ...state.campaignBundleHousingByStatus.filter(
              (_, index) => index > action.payload.status!
            ),
          ]
        : state.campaignBundleHousingByStatus;
      state.campaignBundleHousing = action.payload.status
        ? state.campaignBundleHousing
        : {
            entities: [],
            totalCount: 0,
            filteredCount: 0,
            page: action.payload.page,
            perPage: action.payload.perPage,
            loading: true,
          };
    },
    campaignBundleHousingListFetched: (
      state: CampaignState,
      action: PayloadAction<CampaignBundleHousingListFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.campaignIds === current(state).campaignIds &&
        action.payload.paginatedHousing.page ===
          (action.payload.status
            ? current(state).campaignBundleHousingByStatus[
                action.payload.status
              ]
            : current(state).campaignBundleHousing
          ).page &&
        action.payload.paginatedHousing.perPage ===
          (action.payload.status
            ? current(state).campaignBundleHousingByStatus[
                action.payload.status
              ]
            : current(state).campaignBundleHousing
          ).perPage;
      if (isCurrentFetching) {
        state.campaignBundleHousingByStatus = action.payload.status
          ? [
              ...current(state).campaignBundleHousingByStatus.filter(
                (_, index) => index < action.payload.status!
              ),
              {
                ...current(state).campaignBundleHousingByStatus[
                  action.payload.status
                ],
                entities: action.payload.paginatedHousing.entities,
                filteredCount: action.payload.paginatedHousing.filteredCount,
                totalCount: action.payload.paginatedHousing.totalCount,
                loading: false,
              },
              ...current(state).campaignBundleHousingByStatus.filter(
                (_, index) => index > action.payload.status!
              ),
            ]
          : current(state).campaignBundleHousingByStatus;
        state.campaignBundleHousing = action.payload.status
          ? current(state).campaignBundleHousing
          : {
              ...current(state).campaignBundleHousing,
              entities: action.payload.paginatedHousing.entities,
              filteredCount: action.payload.paginatedHousing.filteredCount,
              totalCount: action.payload.paginatedHousing.filteredCount,
              loading: false,
            };
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
