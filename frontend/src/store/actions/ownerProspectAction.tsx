import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Locality } from '../../models/Locality';
import localityService from '../../services/locality.service';
import { OwnerProspect } from '../../models/OwnerProspect';
import ownerProspectService from '../../services/owner-prospect.service';

export const FETCHING_LOCALITY = 'FETCHING_LOCALITY';
export const LOCALITY_FETCHED = 'LOCALITY_FETCHED';
export const OWNER_PROSPECT_CREATED = 'OWNER_PROSPECT_CREATED';

export interface FetchingLocalityAction {
  type: typeof FETCHING_LOCALITY;
}

export interface LocalityFetchedAction {
  type: typeof LOCALITY_FETCHED;
  locality: Locality;
}

export interface OwnerProspectCreatedAction {
  type: typeof OWNER_PROSPECT_CREATED;
  ownerProspect: OwnerProspect;
}

export type OwnerLocalityActionTypes =
  | FetchingLocalityAction
  | LocalityFetchedAction
  | OwnerProspectCreatedAction;

export const getLocality = (geoCode: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: FETCHING_LOCALITY,
    });

    localityService.getLocality(geoCode).then((locality) => {
      dispatch(hideLoading());
      dispatch({
        type: LOCALITY_FETCHED,
        locality,
      });
    });
  };
};

export const createOwnerProspect = (ownerProspect: OwnerProspect) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());
    ownerProspectService.createOwnerProspect(ownerProspect).then((o) => {
      dispatch(hideLoading());
      dispatch({
        type: OWNER_PROSPECT_CREATED,
        ownerProspect: o,
      });
    });
  };
};
