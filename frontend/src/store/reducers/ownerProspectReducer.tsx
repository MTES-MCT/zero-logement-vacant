import { Locality } from '../../models/Locality';
import {
  FETCHING_LOCALITY,
  LOCALITY_FETCHED,
  OwnerLocalityActionTypes,
} from '../actions/ownerProspectAction';

export interface OwnerProspectState {
  locality?: Locality;
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
    default:
      return state;
  }
};

export default ownerProspectReducer;
