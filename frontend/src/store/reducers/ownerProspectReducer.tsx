import { Locality } from '../../models/Locality';
import {
  FETCHING_LOCALITY,
  LOCALITY_FETCHED,
  OWNER_PROSPECT_CREATED,
  OwnerLocalityActionTypes,
} from '../actions/ownerProspectAction';
import { OwnerProspect } from '../../models/OwnerProspect';

export interface OwnerProspectState {
  locality?: Locality;
  ownerProspect?: OwnerProspect;
}

const initialState: OwnerProspectState = {};

const ownerProspectReducer = (
  state = initialState,
  action: OwnerLocalityActionTypes
) => {
  switch (action.type) {
    case FETCHING_LOCALITY:
      return {
        ...state,
        locality: undefined,
      };
    case LOCALITY_FETCHED:
      return {
        ...state,
        locality: action.locality,
      };
    case OWNER_PROSPECT_CREATED:
      return {
        ...state,
        ownerProspect: action.ownerProspect,
      };
    default:
      return state;
  }
};

export default ownerProspectReducer;
