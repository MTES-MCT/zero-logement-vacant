import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import { HousingDetails } from '../../models/Housing';
import housingService from '../../services/housing.service';

export const FETCHING_OWNER = 'FETCHING_OWNER';
export const OWNER_FETCHED = 'OWNER_FETCHED';
export const FETCHING_OWNER_HOUSING = 'FETCHING_OWNER_HOUSING';
export const OWNER_HOUSING_FETCHED = 'OWNER_HOUSING_FETCHED';
export const OWNER_HOUSING_UPDATED = 'OWNER_HOUSING_UPDATED';

export interface FetchingOwnerAction {
    type: typeof FETCHING_OWNER
}

export interface OwnerFetchedAction {
    type: typeof OWNER_FETCHED,
    owner: Owner
}

export interface FetchingOwnerHousingAction {
    type: typeof FETCHING_OWNER_HOUSING
}

export interface OwnerHousingFetchedAction {
    type: typeof OWNER_HOUSING_FETCHED,
    housingList: HousingDetails[]
}

export interface OwnerHousingUpdatedAction {
    type: typeof OWNER_HOUSING_UPDATED,
    owner: Owner
}

export type OwnerActionTypes =
    FetchingOwnerAction |
    OwnerFetchedAction |
    FetchingOwnerHousingAction |
    OwnerHousingFetchedAction |
    OwnerHousingUpdatedAction;

export const getOwner = (id: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_OWNER
        });

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

        dispatch({
            type: FETCHING_OWNER_HOUSING
        });

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


export const update = (owner: Owner) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        ownerService.updateOwner(owner)
            .then(() => {
                dispatch(hideLoading());
                dispatch({
                    type: OWNER_HOUSING_UPDATED,
                    owner
                });
            })
            .catch(error => {
                console.error(error);
            });
    };
};
