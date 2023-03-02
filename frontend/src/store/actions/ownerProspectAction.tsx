import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { OwnerProspect } from '../../models/OwnerProspect';
import ownerProspectService from '../../services/owner-prospect.service';
import ownerProspectSlice from '../reducers/ownerProspectReducer';
import { AddressSearchResult } from '../../services/address.service';

export interface OwnerProspectCreatedAction {
  ownerProspect: OwnerProspect;
}
export interface AddressSelectedAction {
  addressSearchResult: AddressSearchResult;
}

const { ownerProspectCreated, addressSelected } = ownerProspectSlice.actions;

export const selectAddressSearchResult = (
  addressSearchResult: AddressSearchResult
) => {
  return function (dispatch: Dispatch) {
    dispatch(
      addressSelected({
        addressSearchResult,
      })
    );
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
