import { Campaign, CampaignBundle, CampaignBundleId } from '../../models/Campaign';
import {
    CAMPAIGN_CREATED,
    CAMPAIGN_BUNDLE_FETCHED,
    CAMPAIGN_HOUSING_LIST_FETCHED,
    CAMPAIGN_LIST_FETCHED,
    CAMPAIGN_BUNDLE_LIST_FETCHED,
    CAMPAIGN_UPDATED,
    CampaignActionTypes,
    FETCH_CAMPAIGN_BUNDLE,
    FETCH_CAMPAIGN_HOUSING_LIST,
    FETCH_CAMPAIGN_LIST,
    FETCH_CAMPAIGN_BUNDLE_LIST,
} from '../actions/campaignAction';
import { initialPaginatedResult, PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';

export interface CampaignState {
    campaignList?: Campaign[];
    campaignBundleList?: CampaignBundle[];
    campaignBundle?: CampaignBundle;
    campaignBundleFetchingId?: CampaignBundleId;
    campaignBundleHousingByStatus: PaginatedResult<Housing>[],
    campaignHousingFetchingIds?: string[];
    exportURL: string;
    loading: boolean;
    campaignCreated: boolean
}

const initialState: CampaignState = {
    campaignBundleHousingByStatus: [
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult()
    ],
    exportURL: '',
    loading: true,
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
                campaignCreated: false
            };
        case CAMPAIGN_BUNDLE_FETCHED:
            return {
                ...state,
                campaignBundle: action.campaignBundleFetchingId === state.campaignBundleFetchingId ? action.campaignBundle : state.campaignBundle,
                loading: false
            };
        case FETCH_CAMPAIGN_HOUSING_LIST:
            return {
                ...state,
                campaignHousingFetchingIds: action.campaignHousingFetchingIds,
                campaignBundleHousingByStatus: [
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index < action.status),
                    {
                        entities: [],
                        totalCount: 0,
                        page: action.page,
                        perPage: action.perPage,
                        loading: true
                    },
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index > action.status),
                ]
            };
        case CAMPAIGN_HOUSING_LIST_FETCHED: {
            const isCurrentFetching =
                action.campaignHousingFetchingIds === state.campaignHousingFetchingIds &&
                action.paginatedHousing.page === state.campaignBundleHousingByStatus[action.status].page &&
                action.paginatedHousing.perPage === state.campaignBundleHousingByStatus[action.status].perPage
            return !isCurrentFetching ? state : {
                ...state,
                campaignBundleHousingByStatus: [
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index < action.status),
                    {
                        ...state.campaignBundleHousingByStatus[action.status],
                        entities: action.paginatedHousing.entities,
                        totalCount: action.paginatedHousing.totalCount,
                        loading: false
                    },
                    ...state.campaignBundleHousingByStatus.filter((_, index) => index > action.status),
                ],
                exportURL: action.exportURL,
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
                campaignBundleFetchingId: action.campaignBundleFetchingId,
                false: true
            };
        default:
            return state;
    }
};

export default campaignReducer;
