import { Campaign } from '../../models/Campaign';
import {
    CAMPAIGN_HOUSING_LIST_FETCHED,
    CAMPAIGN_LIST_FETCHED,
    CAMPAIGN_UPDATED,
    CampaignActionTypes,
    FETCH_CAMPAIGN_HOUSING_LIST,
    FETCH_CAMPAIGN_LIST,
} from '../actions/campaignAction';
import { Housing } from '../../models/Housing';


export interface CampaignState {
    campaignList: Campaign[];
    search: string;
    campaignId: string;
    campaignHousingList: Housing[];
    exportURL: string;
}

const initialState = {
    campaignList: [] as Campaign[],
    search: undefined
};

const campaignReducer = (state = initialState, action: CampaignActionTypes) => {
    switch (action.type) {
        case FETCH_CAMPAIGN_LIST:
            return {
                ...state,
                campaignList: [],
                search: action.search
            };
        case CAMPAIGN_LIST_FETCHED:
            return {
                ...state,
                campaignList: (action.search === state.search) ? action.campaignList : state.campaignList
            };
        case FETCH_CAMPAIGN_HOUSING_LIST:
            return {
                ...state,
                campaignHousingList: [],
                campaignId: action.campaignId
            };
        case CAMPAIGN_HOUSING_LIST_FETCHED:
            return {
                ...state,
                campaignHousingList: action.campaignHousingList,
                exportURL: action.exportURL
            };
        case CAMPAIGN_UPDATED:
            return {
                ...state,
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
