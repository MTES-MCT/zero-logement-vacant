import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import housingService from '../../services/housing.service';
import eventService from '../../services/event.service';
import _ from 'lodash';
import { Housing } from '../../models/Housing';
import { OwnerNote } from '../../models/Note';
import { Event } from '../../models/Event';
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

export interface OwnerEventsFetchedAction {
  events: Event[];
}

const {
  fetchingOwnerEvents,
  ownerEventsFetched,
  ownerHousingFetched,
  fetchingOwner,
  ownerFetched,
  ownerUpdated,
  fetchingOwnerHousing,
} = ownerSlice.actions;

export const getOwner = (id: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingOwner());

    ownerService.getOwner(id).then((owner) => {
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
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingOwnerHousing());

    housingService.listByOwner(ownerId).then((result) => {
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

export const getOwnerEvents = (ownerId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingOwnerEvents());

    eventService.listByOwner(ownerId).then((events) => {
      dispatch(hideLoading());
      dispatch(
        ownerEventsFetched({
          events,
        })
      );
    });
  };
};

export const update = (modifiedOwner: Owner) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    if (!_.isEqual(getState().owner.owner, modifiedOwner)) {
      dispatch(showLoading());

      ownerService
        .updateOwner(modifiedOwner)
        .then(() => {
          dispatch(hideLoading());
          dispatch(
            ownerUpdated({
              owner: modifiedOwner,
            })
          );
          getOwnerEvents(modifiedOwner.id)(dispatch);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };
};

export const createOwnerNote = (note: OwnerNote) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    await eventService.createNote(note);
    dispatch(hideLoading());
    getOwnerEvents(note.owner.id)(dispatch);
  };
};
