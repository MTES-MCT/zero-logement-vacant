import { Dispatch } from 'redux';
import { Housing, HousingSort, HousingUpdate } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { DraftOwner, HousingOwner, Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import { Event } from '../../models/Event';
import eventService from '../../services/event.service';
import { FormState } from './FormState';
import { HousingNote } from '../../models/Note';
import _ from 'lodash';
import { handleAbort } from '../../utils/fetchUtils';
import housingReducer from '../reducers/housingReducer';
import { AppState } from '../store';
import { Pagination } from '../../../../shared/models/Pagination';

export interface ExpandFiltersAction {
  value: boolean;
}

export interface HousingFetchedAction {
  housing: Housing;
}

export interface HousingOwnersFetchedAction {
  housingOwners: HousingOwner[];
}

export interface FetchingAdditionalOwnersAction {
  q: string;
  page: number;
  perPage: number;
}

export interface AdditionalOwnersFetchedAction {
  paginatedOwners: PaginatedResult<Owner>;
  q: string;
}

export interface HousingOwnersUpdateAction {
  formState: FormState;
}

export interface HousingEventsFetchedAction {
  events: Event[];
}

export interface FetchingHousingListAction {
  filters: HousingFilters;
  pagination: Pagination;
  sort?: HousingSort;
}

export interface HousingListFetchedAction {
  paginate?: boolean;
  paginatedHousing: PaginatedResult<Housing>;
  filters: HousingFilters;
  sort?: HousingSort;
}

const {
  fetchingHousingEvents,
  fetchingHousingOwners,
  additionalOwnersFetched,
  fetchingAdditionalOwners,
  fetchingHousingList,
  housingEventsFetched,
  fetchingHousing,
  housingListFetched,
  housingOwnersFetched,
  housingOwnersUpdate,
  housingFetched,
  expandingFilters,
} = housingReducer.actions;

export const expandFilters = (value: boolean) => {
  return function (dispatch: Dispatch) {
    dispatch(
      expandingFilters({
        value,
      })
    );
  };
};

export const changeHousingFiltering = (filters: HousingFilters) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const page = 1;
    const perPage = getState().housing.paginatedHousing.perPage;
    const pagination: Pagination = {
      page,
      perPage,
    };

    dispatch(
      fetchingHousingList({
        pagination,
        filters,
      })
    );

    const { dataYearsExcluded, dataYearsIncluded } = filters;

    housingService
      .listHousing(
        filters,
        { dataYearsExcluded, dataYearsIncluded },
        {
          pagination,
          abortable: true,
        }
      )
      .then((result: PaginatedResult<Housing>) => {
        dispatch(
          housingListFetched({
            paginatedHousing: result,
            filters,
          })
        );
      })
      .catch(handleAbort)
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};

export const changeHousingPagination = (pagination: Pagination) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const filters = getState().housing.filters;

    dispatch(
      fetchingHousingList({
        pagination,
        filters,
      })
    );

    const { dataYearsExcluded, dataYearsIncluded } = filters;

    housingService
      .listHousing(
        getState().housing.filters,
        { dataYearsExcluded, dataYearsIncluded },
        {
          pagination,
          abortable: true,
        }
      )
      .then((result: PaginatedResult<Housing>) => {
        dispatch(
          housingListFetched({
            paginate: pagination.paginate,
            paginatedHousing: result,
            filters,
          })
        );
      })
      .catch(handleAbort)
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};

export const changeHousingSort = (sort: HousingSort) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    const { filters, paginatedHousing } = getState().housing;
    const { page, perPage } = paginatedHousing;
    const pagination: Pagination = {
      page,
      perPage,
    };

    dispatch(showLoading());
    dispatch(
      fetchingHousingList({
        pagination,
        filters,
      })
    );

    const { dataYearsExcluded, dataYearsIncluded } = filters;

    housingService
      .listHousing(
        filters,
        { dataYearsExcluded, dataYearsIncluded },
        {
          sort,
          pagination,
          abortable: true,
        }
      )
      .then((result) => {
        dispatch(
          housingListFetched({
            paginatedHousing: result,
            filters,
          })
        );
      })
      .catch(handleAbort)
      .finally(() => {
        dispatch(hideLoading());
      });
  };
};

export const getHousing = (id: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingHousing());

    housingService.getHousing(id).then((housing) => {
      dispatch(hideLoading());
      dispatch(
        housingFetched({
          housing,
        })
      );
    });
  };
};

export const getHousingOwners = (housingId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingHousingOwners());

    ownerService.listByHousing(housingId).then((housingOwners) => {
      dispatch(hideLoading());
      dispatch(
        housingOwnersFetched({
          housingOwners,
        })
      );
    });
  };
};

export const getHousingEvents = (housingId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingHousingEvents());

    eventService.listByHousing(housingId).then((events) => {
      dispatch(hideLoading());
      dispatch(
        housingEventsFetched({
          events,
        })
      );
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
  return function (dispatch: Dispatch, getState: () => AppState) {
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
  return function (dispatch: Dispatch, getState: () => AppState) {
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
  return function (dispatch: Dispatch, getState: () => AppState) {
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

    dispatch(
      housingOwnersUpdate({
        formState: FormState.Init,
      })
    );

    ownerService.updateHousingOwners(housingId, housingOwners).then(() => {
      dispatch(hideLoading());
      dispatch(
        housingOwnersUpdate({
          formState: FormState.Succeed,
        })
      );
      getHousingOwners(housingId)(dispatch);
      getHousingEvents(housingId)(dispatch);
    });
  };
};

export const changeAdditionalOwnersSearching = (q: string) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const page = 1;
    const perPage =
      getState().housing.additionalOwners?.paginatedOwners?.perPage ?? 5;

    dispatch(
      fetchingAdditionalOwners({
        page,
        perPage,
        q,
      })
    );

    ownerService
      .listOwners(q, page, perPage)
      .then((result: PaginatedResult<Owner>) => {
        dispatch(hideLoading());
        dispatch(
          additionalOwnersFetched({
            paginatedOwners: result,
            q,
          })
        );
      });
  };
};

export const changeAdditionalOwnersPagination = (
  page: number,
  perPage: number
) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const q = getState().housing.additionalOwners?.q ?? '';

    dispatch(
      fetchingAdditionalOwners({
        page: page,
        perPage,
        q,
      })
    );

    ownerService
      .listOwners(q, page, perPage)
      .then((result: PaginatedResult<Owner>) => {
        dispatch(hideLoading());
        dispatch(
          additionalOwnersFetched({
            paginatedOwners: result,
            q,
          })
        );
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
