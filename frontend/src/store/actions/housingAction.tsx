import { Dispatch } from 'redux';
import { Housing, HousingSort, HousingUpdate } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { DraftOwner, HousingOwner, Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import { Event } from '../../models/Event';
import eventService from '../../services/event.service';
import { FormState } from './FormState';
import { HousingNote } from '../../models/Note';
import _ from 'lodash';

export const EXPAND_FILTERS = 'EXPAND_FILTERS';
export const FETCHING_HOUSING_LIST = 'FETCHING_HOUSING_LIST';
export const HOUSING_LIST_FETCHED = 'HOUSING_LIST_FETCHED';
export const FETCHING_HOUSING = 'FETCHING_HOUSING';
export const HOUSING_FETCHED = 'HOUSING_FETCHED';
export const FETCHING_HOUSING_OWNERS = 'FETCHING_HOUSING_OWNERS';
export const HOUSING_OWNERS_FETCHED = 'HOUSING_OWNERS_FETCHED';
export const FETCHING_ADDITIONAL_OWNERS = 'FETCHING_ADDITIONAL_OWNERS';
export const ADDITIONAL_OWNERS_FETCHED = 'ADDITIONAL_OWNERS_FETCHED';
export const HOUSING_OWNERS_UPDATE = 'HOUSING_OWNERS_UPDATE';
export const FETCHING_HOUSING_EVENTS = 'FETCHING_HOUSING_EVENTS';
export const HOUSING_EVENTS_FETCHED = 'HOUSING_EVENTS_FETCHED';

export interface ExpandFiltersAction {
  type: typeof EXPAND_FILTERS;
  value: boolean;
}

export interface FetchingHousingAction {
  type: typeof FETCHING_HOUSING;
}

export interface HousingFetchedAction {
  type: typeof HOUSING_FETCHED;
  housing: Housing;
}

export interface FetchingHousingOwnersAction {
  type: typeof FETCHING_HOUSING_OWNERS;
}

export interface HousingOwnersFetchedAction {
  type: typeof HOUSING_OWNERS_FETCHED;
  housingOwners: HousingOwner[];
}

export interface FetchingAdditionalOwnersAction {
  type: typeof FETCHING_ADDITIONAL_OWNERS;
  q: string;
  page: number;
  perPage: number;
}

export interface AdditionalOwnersFetchedAction {
  type: typeof ADDITIONAL_OWNERS_FETCHED;
  paginatedOwners: PaginatedResult<Owner>;
  q: string;
}

export interface HousingOwnersUpdateAction {
  type: typeof HOUSING_OWNERS_UPDATE;
  formState: typeof FormState;
}

export interface FetchingHousingEventsAction {
  type: typeof FETCHING_HOUSING_EVENTS;
}

export interface HousingEventsFetchedAction {
  type: typeof HOUSING_EVENTS_FETCHED;
  events: Event[];
}

export interface FetchHousingListAction {
  type: typeof FETCHING_HOUSING_LIST;
  filters: HousingFilters;
  page: number;
  perPage: number;
  sort: HousingSort;
}

export interface HousingListFetchedAction {
  type: typeof HOUSING_LIST_FETCHED;
  paginatedHousing: PaginatedResult<Housing>;
  filters: HousingFilters;
  sort: HousingSort;
}

export type HousingActionTypes =
  | ExpandFiltersAction
  | FetchingHousingAction
  | HousingFetchedAction
  | FetchHousingListAction
  | HousingListFetchedAction
  | FetchingHousingOwnersAction
  | HousingOwnersFetchedAction
  | FetchingAdditionalOwnersAction
  | AdditionalOwnersFetchedAction
  | HousingOwnersUpdateAction
  | FetchingHousingEventsAction
  | HousingEventsFetchedAction;

export const expandFilters = (value: boolean) => {
  return function (dispatch: Dispatch) {
    dispatch({
      type: EXPAND_FILTERS,
      value,
    });
  };
};

export const changeHousingFiltering = (filters: HousingFilters) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const page = 1;
    const perPage = getState().housing.paginatedHousing.perPage;

    dispatch({
      type: FETCHING_HOUSING_LIST,
      page,
      perPage,
      filters,
    });

    const { dataYearsExcluded, dataYearsIncluded } = filters;

    housingService
      .listHousing(
        filters,
        { dataYearsExcluded, dataYearsIncluded },
        page,
        perPage
      )
      .then((result: PaginatedResult<Housing>) => {
        dispatch(hideLoading());
        dispatch({
          type: HOUSING_LIST_FETCHED,
          paginatedHousing: result,
          filters,
        });
      });
  };
};

export const changeHousingPagination = (page: number, perPage: number) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const filters = getState().housing.filters;

    dispatch({
      type: FETCHING_HOUSING_LIST,
      page: page,
      perPage,
      filters,
    });

    const { dataYearsExcluded, dataYearsIncluded } = filters;

    housingService
      .listHousing(
        getState().housing.filters,
        { dataYearsExcluded, dataYearsIncluded },
        page,
        perPage
      )
      .then((result: PaginatedResult<Housing>) => {
        dispatch(hideLoading());
        dispatch({
          type: HOUSING_LIST_FETCHED,
          paginatedHousing: result,
          filters,
        });
      });
  };
};

export const changeHousingSort = (sort: HousingSort) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    const { filters, paginatedHousing } = getState().housing;
    const { page, perPage } = paginatedHousing;

    dispatch(showLoading());
    dispatch({
      type: FETCHING_HOUSING_LIST,
      page,
      perPage,
      filters,
    });

    const { dataYearsExcluded, dataYearsIncluded } = filters;

    housingService
      .listHousing(
        filters,
        { dataYearsExcluded, dataYearsIncluded },
        page,
        perPage,
        sort
      )
      .then((result) => {
        dispatch(hideLoading());
        dispatch({
          type: HOUSING_LIST_FETCHED,
          paginatedHousing: result,
          filters,
        });
      });
  };
};

export const getHousing = (id: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: FETCHING_HOUSING,
    });

    housingService.getHousing(id).then((housing) => {
      dispatch(hideLoading());
      dispatch({
        type: HOUSING_FETCHED,
        housing,
      });
    });
  };
};

export const getHousingOwners = (housingId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: FETCHING_HOUSING_OWNERS,
    });

    ownerService.listByHousing(housingId).then((housingOwners) => {
      dispatch(hideLoading());
      dispatch({
        type: HOUSING_OWNERS_FETCHED,
        housingOwners,
      });
    });
  };
};

export const getHousingEvents = (housingId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: FETCHING_HOUSING_EVENTS,
    });

    eventService.listByHousing(housingId).then((events) => {
      dispatch(hideLoading());
      dispatch({
        type: HOUSING_EVENTS_FETCHED,
        events,
      });
    });
  };
};

export const updateHousing = (
  housing: Housing,
  housingUpdate: HousingUpdate
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    housingService.updateHousing(housing.id, housingUpdate).then(() => {
      dispatch(hideLoading());
      getHousing(housing.id)(dispatch);
      getHousingEvents(housing.id)(dispatch);
    });
  };
};

export const createAdditionalOwner = (
  housingId: string,
  draftOwner: DraftOwner,
  ownerRank: number
) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    ownerService
      .createOwner(draftOwner)
      .then((owner) => {
        dispatch(hideLoading());
        addHousingOwner(housingId, owner, ownerRank)(dispatch, getState);
      })
      .catch((error) => {
        console.error(error);
      });
  };
};

export const updateMainHousingOwner = (
  modifiedOwner: Owner,
  housingId: string
) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    if (!_.isEqual(getState().owner.owner, modifiedOwner)) {
      dispatch(showLoading());

      ownerService
        .updateOwner(modifiedOwner)
        .then(() => {
          dispatch(hideLoading());
          getHousingOwners(housingId)(dispatch);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };
};

export const addHousingOwner = (
  housingId: string,
  owner: Owner,
  ownerRank: number
) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    const { housingOwners } = getState().housing;

    updateHousingOwners(housingId, [
      ...(housingOwners ?? []).map((ho) => ({
        ...ho,
        rank: ownerRank && ownerRank <= ho.rank ? ho.rank + 1 : ho.rank,
      })),
      {
        ...owner,
        housingId: housingId,
        rank: ownerRank,
        startDate: new Date(),
        origin: 'ZLV',
      },
    ])(dispatch);
  };
};

export const updateHousingOwners = (
  housingId: string,
  housingOwners: HousingOwner[]
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: HOUSING_OWNERS_UPDATE,
      formState: FormState.Init,
    });

    ownerService.updateHousingOwners(housingId, housingOwners).then(() => {
      dispatch(hideLoading());
      dispatch({
        type: HOUSING_OWNERS_UPDATE,
        formState: FormState.Succeed,
      });
      getHousingOwners(housingId)(dispatch);
      getHousingEvents(housingId)(dispatch);
    });
  };
};

export const changeAdditionalOwnersSearching = (q: string) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const page = 1;
    const perPage =
      getState().housing.additionalOwners?.paginatedOwners?.perPage ?? 5;

    dispatch({
      type: FETCHING_ADDITIONAL_OWNERS,
      page,
      perPage,
      q,
    });

    ownerService
      .listOwners(q, page, perPage)
      .then((result: PaginatedResult<Owner>) => {
        dispatch(hideLoading());
        dispatch({
          type: ADDITIONAL_OWNERS_FETCHED,
          paginatedOwners: result,
          q,
        });
      });
  };
};

export const changeAdditionalOwnersPagination = (
  page: number,
  perPage: number
) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const q = getState().housing.additionalOwners?.q ?? '';

    dispatch({
      type: FETCHING_ADDITIONAL_OWNERS,
      page: page,
      perPage,
      q,
    });

    ownerService
      .listOwners(q, page, perPage)
      .then((result: PaginatedResult<Owner>) => {
        dispatch(hideLoading());
        dispatch({
          type: ADDITIONAL_OWNERS_FETCHED,
          paginatedOwners: result,
          q,
        });
      });
  };
};

export const createHousingNote = (note: HousingNote) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    await eventService.createNote(note);
    dispatch(hideLoading());
  };
};
