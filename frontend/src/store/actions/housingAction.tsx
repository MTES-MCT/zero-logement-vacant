import { Dispatch } from 'redux';
import { Housing, HousingSort, HousingUpdate } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { HousingFilters } from '../../models/HousingFilters';
import { HousingPaginatedResult } from '../../models/PaginatedResult';
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

    const { paginate, paginatedHousing } = getState().housing;
    const page = 1;
    const perPage = paginatedHousing.perPage;
    const pagination: Pagination = {
      paginate,
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
      .then((result: HousingPaginatedResult) => {
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
      .then((result: HousingPaginatedResult) => {
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
