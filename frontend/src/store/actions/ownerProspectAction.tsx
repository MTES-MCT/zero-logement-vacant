import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Locality } from '../../models/Locality';
import localityService from '../../services/locality.service';
import { OwnerProspect } from '../../models/OwnerProspect';
import ownerProspectService from '../../services/owner-prospect.service';
import ownerProspectSlice from '../reducers/ownerProspectReducer';

export interface LocalityFetchedAction {
  locality: Locality;
}

export interface OwnerProspectCreatedAction {
  ownerProspect: OwnerProspect;
}

const { localityFetched, fetchingLocality, ownerProspectCreated } =
  ownerProspectSlice.actions;

export const getLocality = (geoCode: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingLocality());

    localityService.getLocality(geoCode).then((locality) => {
      dispatch(hideLoading());
      dispatch(
        localityFetched({
          locality,
        })
      );
    });
  };
};

export const createOwnerProspect = (ownerProspect: OwnerProspect) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());
    ownerProspectService.createOwnerProspect(ownerProspect).then((o) => {
      dispatch(hideLoading());
      dispatch(
        ownerProspectCreated({
          ownerProspect: o,
        })
      );
    });
  };
};
