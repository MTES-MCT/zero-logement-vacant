import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { OwnerProspect } from '../../models/OwnerProspect';
import ownerProspectService, {
  FindOptions,
} from '../../services/owner-prospect.service';
import ownerProspectSlice from '../reducers/ownerProspectReducer';
import { AppState } from '../store';
import { AddressSearchResult } from '../../services/address.service';
import { PaginatedResult } from '../../models/PaginatedResult';

export interface OwnerProspectCreatedAction {
  ownerProspect: OwnerProspect;
}
export interface AddressSelectedAction {
  addressSearchResult: AddressSearchResult;
}

export interface OwnerProspectsFetchedAction {
  ownerProspects: PaginatedResult<OwnerProspect>;
}

export interface OwnerProspectUpdatedAction {
  ownerProspect: OwnerProspect;
}

const {
  addressSelected,
  ownerProspectCreated,
  ownerProspectsFetched,
  ownerProspectUpdated,
} = ownerProspectSlice.actions;

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
    ownerProspectService.create(ownerProspect).then((o) => {
      dispatch(hideLoading());
      dispatch(
        ownerProspectCreated({
          ownerProspect: o,
        })
      );
    });
  };
};

export const findOwnerProspects = (options?: FindOptions) => {
  return async function (dispatch: Dispatch, getState: () => AppState) {
    try {
      const user = getState().authentication.authUser;

      if (user) {
        dispatch(showLoading());

        const ownerProspects = await ownerProspectService.find(options);
        dispatch(
          ownerProspectsFetched({
            ownerProspects,
          })
        );
      }
    } finally {
      dispatch(hideLoading());
    }
  };
};

export const updateOwnerProspect = (ownerProspect: OwnerProspect) => {
  return async function (dispatch: Dispatch) {
    try {
      dispatch(showLoading());

      await ownerProspectService.update(ownerProspect);
      dispatch(
        ownerProspectUpdated({
          ownerProspect,
        })
      );
    } finally {
      dispatch(hideLoading());
    }
  };
};
