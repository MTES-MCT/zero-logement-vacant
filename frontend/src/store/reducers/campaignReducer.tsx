import { Campaign, CampaignBundle, CampaignBundleId } from '../../models/Campaign';
import {
    CAMPAIGN_BUNDLE_FETCHED,
    CAMPAIGN_BUNDLE_LIST_FETCHED,
    CAMPAIGN_CREATED,
    CAMPAIGN_BUNDLE_HOUSING_LIST_FETCHED,
    CAMPAIGN_LIST_FETCHED,
    CAMPAIGN_UPDATED,
    CampaignActionTypes,
    FETCH_CAMPAIGN_BUNDLE,
    FETCH_CAMPAIGN_BUNDLE_LIST,
    FETCH_CAMPAIGN_BUNDLE_HOUSING_LIST,
    FETCH_CAMPAIGN_LIST,
} from '../actions/campaignAction';
import { initialPaginatedResult, PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';

export interface CampaignState {
    campaignList?: Campaign[];
    campaignBundleList?: CampaignBundle[];
    campaignBundle?: CampaignBundle;
    campaignBundleFetchingId?: CampaignBundleId;
    campaignBundleHousingByStatus: PaginatedResult<Housing>[],
    campaignBundleHousing: PaginatedResult<Housing>,
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
        initialPaginatedResult()
    ],
    campaignBundleHousing: initialPaginatedResult(),
    loading: false,
    campaignCreated: false
};

const campaignReducer = (state = initialState, action: CampaignActionTypes) => {
    switch (action.type) {
        case FETCH_CAMPAIGN_LIST:
            return {
                ...state,
                campaignList: [],
                loading: true
            };
        case CAMPAIGN_LIST_FETCHED:
            return {
                ...state,
                campaignList: action.campaignList,
                loading: false
            };
        case FETCH_CAMPAIGN_BUNDLE_LIST:
            return {
                ...state,
                campaignBundleList: [],
                loading: true
            };
        case CAMPAIGN_BUNDLE_LIST_FETCHED:
            return {
                ...state,
                campaignBundleList: action.campaignBundleList,
                loading: false
            };
        case FETCH_CAMPAIGN_BUNDLE:
            return {
                ...state,
                campaignBundleFetchingId: action.campaignBundleFetchingId,
                campaignBundle: action.campaignBundleFetchingId === state.campaignBundleFetchingId ? state.campaignBundle : undefined,
                loading: true,
                campaignCreated: false,
                searchQuery: action.searchQuery
            };
        case CAMPAIGN_BUNDLE_FETCHED: {
            const isCurrentFetching =
                action.campaignBundleFetchingId === state.campaignBundleFetchingId &&
                action.searchQuery === state.searchQuery
            return !isCurrentFetching ? state : {
                ...state,
                campaignBundle: action.campaignBundle,
                loading: false,
            };
        }
        case FETCH_CAMPAIGN_BUNDLE_HOUSING_LIST:
            return {
                ...state,
                campaignIds: action.campaignIds,
                campaignBundleHousingByStatus: action.status ? [
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index < action.status!),
                    {
                        entities: [],
                        totalCount: 0,
                        page: action.page,
                        perPage: action.perPage,
                        loading: true
                    },
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index > action.status!),
                ] : state.campaignBundleHousingByStatus,
                campaignBundleHousing: action.status ? state.campaignBundleHousing : {
                    entities: [],
                    totalCount: 0,
                    page: action.page,
                    perPage: action.perPage,
                    loading: true
                }
            };
        case CAMPAIGN_BUNDLE_HOUSING_LIST_FETCHED: {
            const isCurrentFetching =
                action.campaignIds === state.campaignIds &&
                action.paginatedHousing.page === (action.status ? state.campaignBundleHousingByStatus[action.status] : state.campaignBundleHousing).page &&
                action.paginatedHousing.perPage === (action.status ? state.campaignBundleHousingByStatus[action.status] : state.campaignBundleHousing).perPage
            return !isCurrentFetching ? state : {
                ...state,
                campaignBundleHousingByStatus: action.status ? [
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index < action.status!),
                    {
                        ...state.campaignBundleHousingByStatus[action.status],
                        entities: action.paginatedHousing.entities,
                        totalCount: action.paginatedHousing.totalCount,
                        loading: false
                    },
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index > action.status!),
                ] : state.campaignBundleHousingByStatus,
                campaignBundleHousing: action.status ? state.campaignBundleHousing : {
                    ...state.campaignBundleHousing,
                    entities: action.paginatedHousing.entities,
                    totalCount: action.paginatedHousing.totalCount,
                    loading: false
                },
            };
        }
        case CAMPAIGN_CREATED:
            return {
                ...state,
                campaignBundleFetchingId: action.campaignBundleFetchingId,
                campaignBundle: undefined,
                campaignHousingList: [],
                campaignCreated: true
            };
        case CAMPAIGN_UPDATED:
            return {
                ...state,
                campaignBundleFetchingId: action.campaignBundleFetchingId
            };
        default:
            return state;
    }
};

export default campaignReducer;
