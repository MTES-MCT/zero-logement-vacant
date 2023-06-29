import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import housingService from '../../services/housing.service';
import { Housing } from '../../models/Housing';
import ownerSlice from '../reducers/ownerReducer';

export interface OwnerHousingFetchedAction {
  housingList: Housing[];
  housingTotalCount: number;
}

const { ownerHousingFetched, fetchingOwnerHousing } = ownerSlice.actions;

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
