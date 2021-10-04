import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import { Housing, HousingDetails } from '../../models/Housing';
import housingService from '../../services/housing.service';

export const OWNER_FETCHED = 'OWNER_FETCHED';
export const OWNER_HOUSING_FETCHED = 'OWNER_HOUSING_FETCHED';

export interface OwnerFetchedAction {
    type: typeof OWNER_FETCHED,
    owner: Owner
}

export interface OwnerHousingFetchedAction {
    type: typeof OWNER_HOUSING_FETCHED,
    housingList: HousingDetails[]
}

export type OwnerActionTypes = OwnerFetchedAction | OwnerHousingFetchedAction;

export const getOwner = (id: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        ownerService.getOwner(id)
            .then(owner => {
                dispatch(hideLoading());
                dispatch({
                    type: OWNER_FETCHED,
                    owner
                });
            });
    };
};

export const getOwnerHousing = (ownerId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        housingService.listByOwner(ownerId)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: OWNER_HOUSING_FETCHED,
                    housingList
                });
            });
    };
};
