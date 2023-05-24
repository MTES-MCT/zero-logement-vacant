import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import housingService from '../../services/housing.service';
import _ from 'lodash';
import { Housing } from '../../models/Housing';
import ownerSlice from '../reducers/ownerReducer';
import { AppState } from '../store';

export interface OwnerFetchedAction {
  owner: Owner;
}

export interface OwnerHousingFetchedAction {
  housingList: Housing[];
  housingTotalCount: number;
}

export interface OwnerUpdatedAction {
  owner: Owner;
}

const {
  ownerHousingFetched,
  fetchingOwner,
  ownerFetched,
  ownerUpdated,
  fetchingOwnerHousing,
} = ownerSlice.actions;

export const getOwner = (id: string) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingOwner());

    await ownerService.getOwner(id).then((owner) => {
      dispatch(hideLoading());
      dispatch(
        ownerFetched({
          owner,
        })
      );
    });
  };
};

export const getOwnerHousing = (ownerId: string) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingOwnerHousing());

    await housingService.listByOwner(ownerId).then((result) => {
      dispatch(hideLoading());
      dispatch(
        ownerHousingFetched({
          housingList: result.entities,
          housingTotalCount: result.totalCount,
        })
      );
    });
  };
};

export const update = (modifiedOwner: Owner, callback: () => void) => {
  return async function (dispatch: Dispatch, getState: () => AppState) {
    if (!_.isEqual(getState().owner.owner, modifiedOwner)) {
      dispatch(showLoading());

      await ownerService
        .updateOwner(modifiedOwner)
        .then(() => {
          dispatch(hideLoading());
          dispatch(
            ownerUpdated({
              owner: modifiedOwner,
            })
          );
          callback();
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };
};
