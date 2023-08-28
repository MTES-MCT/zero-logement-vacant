import { Dispatch } from 'redux';
import { Housing, HousingSort, HousingUpdate } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { HousingFilters } from '../../models/HousingFilters';
import { handleAbort } from '../../utils/fetchUtils';
import housingReducer from '../reducers/housingReducer';
import { AppState } from '../store';
import { Pagination } from '../../../../shared/models/Pagination';
import { HousingPaginatedResult } from '../../models/PaginatedResult';

export interface ExpandFiltersAction {
  value: boolean;
}

export interface HousingFetchedAction {
  housing: Housing;
}

export interface FetchingAdditionalOwnersAction {
  q: string;
  page: number;
  perPage: number;
}

export interface FetchingHousingListAction {
  filters: HousingFilters;
  pagination: Pagination;
  sort?: HousingSort;
}

export interface HousingListFetchedAction {
  totalCount: number;
  totalOwnerCount: number;
  paginate?: boolean;
  paginatedHousing: HousingPaginatedResult;
  filters: HousingFilters;
  sort?: HousingSort;
}

const {
  fetchingHousingList,
  fetchingHousing,
  housingListFetched,
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

    const state = getState().housing;
    const pagination: Pagination = { ...state.pagination, page: 1 };

    dispatch(
      fetchingHousingList({
        pagination,
        filters,
      })
    );

    const { dataYearsExcluded, dataYearsIncluded, occupancies } = filters;

    Promise.all([
      housingService.count({
        dataYearsExcluded,
        dataYearsIncluded,
        occupancies,
      }),
      housingService.find({
        filters,
        pagination,
        abortable: true,
      }),
    ])
      .then(([total, result]) => {
        dispatch(
          housingListFetched({
            totalCount: total.housing,
            totalOwnerCount: total.owners,
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

    const { dataYearsExcluded, dataYearsIncluded, occupancies } = filters;

    Promise.all([
      housingService.count({
        dataYearsExcluded,
        dataYearsIncluded,
        occupancies,
      }),
      housingService.find({
        filters: getState().housing.filters,
        pagination,
        abortable: true,
      }),
    ])
      .then(([total, paginatedHousing]) => {
        dispatch(
          housingListFetched({
            totalCount: total.housing,
            totalOwnerCount: total.owners,
            paginatedHousing,
            paginate: pagination.paginate,
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

    const { dataYearsExcluded, dataYearsIncluded, occupancies } = filters;

    Promise.all([
      housingService.count({
        dataYearsExcluded,
        dataYearsIncluded,
        occupancies,
      }),
      housingService.find({
        filters,
        sort,
        pagination,
        abortable: true,
      }),
    ])
      .then(([count, paginatedHousing]) => {
        dispatch(
          housingListFetched({
            totalCount: count.housing,
            totalOwnerCount: count.owners,
            paginatedHousing,
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
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingHousing());

    await housingService.getHousing(id).then((housing) => {
      dispatch(hideLoading());
      dispatch(
        housingFetched({
          housing,
        })
      );
    });
  };
};

export const updateHousing = (
  housing: Housing,
  housingUpdate: HousingUpdate,
  callback: () => void
) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    await housingService
      .updateHousing(housing.id, housingUpdate)
      .then(async () => {
        dispatch(hideLoading());
        callback();
        await getHousing(housing.id)(dispatch);
      });
  };
};
