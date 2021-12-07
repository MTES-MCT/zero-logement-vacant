import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import housingService from '../../services/housing.service';
import { EventKinds } from '../../models/OwnerEvent';
import eventService from '../../services/event.service';
import { ApplicationState } from '../reducers/applicationReducers';
import _ from 'lodash';
import { Housing } from '../../models/Housing';

export const FETCHING_OWNER = 'FETCHING_OWNER';
export const OWNER_FETCHED = 'OWNER_FETCHED';
export const FETCHING_OWNER_HOUSING = 'FETCHING_OWNER_HOUSING';
export const OWNER_HOUSING_FETCHED = 'OWNER_HOUSING_FETCHED';
export const OWNER_UPDATED = 'OWNER_UPDATED';
export const FETCHING_OWNER_EVENTS = 'FETCHING_OWNER_EVENTS';
export const OWNER_EVENTS_FETCHED = 'OWNER_EVENTS_FETCHED';

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
    housingList: Housing[]
}

export interface OwnerUpdatedAction {
    type: typeof OWNER_UPDATED,
    owner: Owner
}

export interface FetchingOwnerEventsAction {
    type: typeof FETCHING_OWNER_EVENTS
}

export interface OwnerEventsFetchedAction {
    type: typeof OWNER_EVENTS_FETCHED,
    events: Event[]
}

export type OwnerActionTypes =
    FetchingOwnerAction |
    OwnerFetchedAction |
    FetchingOwnerHousingAction |
    OwnerHousingFetchedAction |
    OwnerUpdatedAction |
    FetchingOwnerEventsAction |
    OwnerEventsFetchedAction;

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

export const getOwnerEvents = (ownerId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_OWNER_EVENTS
        });

        eventService.listByOwner(ownerId)
            .then(events => {
                dispatch(hideLoading());
                dispatch({
                    type: OWNER_EVENTS_FETCHED,
                    events
                });
            });
    };
};


export const update = (modifiedOwner: Owner) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        if (!_.isEqual(getState().owner.owner, modifiedOwner)) {

            dispatch(showLoading());

            ownerService.updateOwner(modifiedOwner)
                .then(() => {
                    createEvent(modifiedOwner.id, EventKinds.OwnerUpdate, 'Modification des données d\'identité')(dispatch)
                    dispatch(hideLoading());
                    dispatch({
                        type: OWNER_UPDATED,
                        owner: modifiedOwner
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        }
    };
};

export const createEvent = (ownerId: string, kind: EventKinds, content: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        eventService.createEvent(ownerId, kind, content)
            .then(() => {
                getOwnerEvents(ownerId)(dispatch)
                dispatch(hideLoading());
            });
    };
};
