import { Campaign } from '../../models/Campaign';
import {
    CAMPAIGN_CREATED,
    CAMPAIGN_FETCHED,
    CAMPAIGN_HOUSING_LIST_FETCHED,
    CAMPAIGN_LIST_FETCHED,
    CAMPAIGN_UPDATED,
    CampaignActionTypes,
    FETCH_CAMPAIGN,
    FETCH_CAMPAIGN_HOUSING_LIST,
    FETCH_CAMPAIGN_LIST,
} from '../actions/campaignAction';
import { CampaignHousing } from '../../models/Housing';
import { initialPaginatedResult, PaginatedResult } from '../../models/PaginatedResult';

export interface CampaignState {
    campaignFetchingId?: string;
    campaignHousingFetchingId?: string;
    campaignList?: Campaign[];
    campaign?: Campaign;
    campaignHousingByStatus: PaginatedResult<CampaignHousing>[],
    exportURL: string;
    loading: boolean;
}

const initialState: CampaignState = {
    campaignHousingByStatus: [
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult(),
        initialPaginatedResult()
    ],
    exportURL: '',
    loading: true
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
        case FETCH_CAMPAIGN:
            return {
                ...state,
                campaignFetchingId: action.campaignFetchingId,
                campaign: undefined,
                loading: true
            };
        case CAMPAIGN_FETCHED:
            return {
                ...state,
                campaignFetchingId: undefined,
                campaign: action.campaignFetchingId === state.campaignFetchingId ? action.campaign : state.campaign,
                loading: false
            };
        case FETCH_CAMPAIGN_HOUSING_LIST:
            return {
                ...state,
                campaignHousingFetchingId: action.campaignHousingFetchingId,
                campaignHousingByStatus: [
                    ...state.campaignHousingByStatus.filter((_, index) => index < action.status),
                    {
                        entities: [],
                        totalCount: 0,
                        page: action.page,
                        perPage: action.perPage,
                        loading: true
                    },
                    ...state.campaignHousingByStatus.filter((_, index) => index > action.status),
                ]
            };
        case CAMPAIGN_HOUSING_LIST_FETCHED: {
            const isCurrentFetching =
                action.campaignHousingFetchingId === state.campaignHousingFetchingId &&
                action.paginatedHousing.page === state.campaignHousingByStatus[action.status].page &&
                action.paginatedHousing.perPage === state.campaignHousingByStatus[action.status].perPage
            return !isCurrentFetching ? state : {
                ...state,
                campaignHousingByStatus: [
                    ...state.campaignHousingByStatus.filter((_, index) => index < action.status),
                    {
                        ...state.campaignHousingByStatus[action.status],
                        entities: action.paginatedHousing.entities,
                        totalCount: action.paginatedHousing.totalCount,
                        loading: false
                    },
                    ...state.campaignHousingByStatus.filter((_, index) => index > action.status),
                ],
                exportURL: action.exportURL,
            };
        }
        case CAMPAIGN_CREATED:
            return {
                ...state,
                campaignFetchingId: action.campaignId,
                campaign: undefined,
                campaignHousingList: []
            };
        case CAMPAIGN_UPDATED:
            return {
                ...state,
                campaign: action.campaign
            };
        default:
            return state;
    }
};

export default campaignReducer;
