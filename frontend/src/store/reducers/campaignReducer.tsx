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
import { Housing } from '../../models/Housing';
import { PaginatedResult } from '../../models/PaginatedResult';


export interface CampaignState {
    campaignList: Campaign[];
    campaign?: Campaign;
    paginatedHousing: PaginatedResult<Housing>;
    exportURL: string;
}

const initialState: CampaignState = {
    campaignList: [] as Campaign[],
    paginatedHousing: {
        entities: [],
        page: 1,
        perPage: 20,
        totalCount: 0
    },
    exportURL: ''
};

const campaignReducer = (state = initialState, action: CampaignActionTypes) => {
    switch (action.type) {
        case FETCH_CAMPAIGN_LIST:
            return {
                ...state,
                campaignList: [],
            };
        case CAMPAIGN_LIST_FETCHED:
            return {
                ...state,
                campaignList: action.campaignList
            };
        case FETCH_CAMPAIGN:
            return {
                ...state,
                campaign: undefined,
            };
        case CAMPAIGN_FETCHED:
            return {
                ...state,
                campaign: action.campaign
            };
        case FETCH_CAMPAIGN_HOUSING_LIST:
            return {
                ...state,
                campaignId: action.campaignId,
                paginatedHousing: {
                    entities: [],
                    totalCount: 0,
                    page: action.page,
                    perPage: action.perPage
                }
            };
        case CAMPAIGN_HOUSING_LIST_FETCHED: {
            const isCurrentFetching =
                action.campaignId === state.campaign?.id &&
                action.paginatedHousing.page === state.paginatedHousing.page &&
                action.paginatedHousing.perPage === state.paginatedHousing.perPage
            return !isCurrentFetching ? state : {
                ...state,
                paginatedHousing: {
                    ...state.paginatedHousing,
                    entities: action.paginatedHousing.entities,
                    totalCount: action.paginatedHousing.totalCount,
                },
                exportURL: action.exportURL
            };
        }
        case CAMPAIGN_CREATED:
            return {
                ...state,
                campaignList: [
                    ...state.campaignList,
                    action.campaign
                ],
                campaignHousingList: []
            };
        case CAMPAIGN_UPDATED:
            return {
                ...state,
                campaign: action.campaign,
                campaignList: [
                    ...state.campaignList.filter(_ => _.id !== action.campaign.id),
                    action.campaign
                ]
            };
        default:
            return state;
    }
};

export default campaignReducer;
