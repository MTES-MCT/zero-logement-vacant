import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Locality } from '../../models/Locality';
import localityService from '../../services/locality.service';
import { OwnerProspect } from '../../models/OwnerProspect';
import ownerProspectService from '../../services/owner-prospect.service';

export const FETCHING_LOCALITY = 'FETCHING_LOCALITY';
export const LOCALITY_FETCHED = 'LOCALITY_FETCHED';

export interface FetchingLocalityAction {
  type: typeof FETCHING_LOCALITY;
}

export interface LocalityFetchedAction {
  type: typeof LOCALITY_FETCHED;
  locality: Locality;
}

export type OwnerLocalityActionTypes =
  | FetchingLocalityAction
  | LocalityFetchedAction;

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
    await ownerProspectService.createOwnerProspect(ownerProspect);
    dispatch(hideLoading());
  };
};
