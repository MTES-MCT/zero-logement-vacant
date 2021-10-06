import { Campaign, CampaignFilters } from '../../models/Campaign';
import { CAMPAIGN_LIST_FETCHED, CampaignActionTypes, FETCH_CAMPAIGN_LIST } from '../actions/campaignAction';


export interface CampaignState {
    campaignList: Campaign[];
    filters: CampaignFilters;
    search: string;
}

export const initialFilters = {
} as CampaignFilters;

const initialState = {
    campaignList: [],
    filters: initialFilters,
    search: undefined
};

const campaignReducer = (state = initialState, action: CampaignActionTypes) => {
    switch (action.type) {
        case FETCH_CAMPAIGN_LIST:
            return {
                ...state,
                campaignList: [],
                filters: action.filters,
                search: action.search
            };
        case CAMPAIGN_LIST_FETCHED:
            return {
                ...state,
                campaignList: (action.filters === state.filters && action.search === state.search) ? action.campaignList : state.campaignList
            };
        default:
            return state;
    }
};

export default campaignReducer;
