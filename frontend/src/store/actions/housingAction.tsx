import { Dispatch } from 'redux';
import { Housing, HousingSort, HousingUpdate } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { DraftOwner, HousingOwner, Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import { FormState } from './FormState';
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
  fetchingHousingOwners,
  additionalOwnersFetched,
  fetchingAdditionalOwners,
  fetchingHousingList,
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

export const getHousingOwners = (housingId: string) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchingHousingOwners());

    await ownerService.listByHousing(housingId).then((housingOwners) => {
      dispatch(hideLoading());
      dispatch(
        housingOwnersFetched({
          housingOwners,
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
        await getHousing(housing.id)(dispatch);
        callback();
      });
  };
};

export const createAdditionalOwner = (
  housingId: string,
  draftOwner: DraftOwner,
  ownerRank: number,
  callback: () => void
) => {
  return async function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    await ownerService
      .createOwner(draftOwner)
      .then(async (owner) => {
        dispatch(hideLoading());
        await addHousingOwner(
          housingId,
          owner,
          ownerRank,
          callback
        )(dispatch, getState);
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
  return async function (dispatch: Dispatch, getState: () => AppState) {
    if (!_.isEqual(getState().owner.owner, modifiedOwner)) {
      dispatch(showLoading());

      await ownerService
        .updateOwner(modifiedOwner)
        .then(async () => {
          dispatch(hideLoading());
          await getHousingOwners(housingId)(dispatch);
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
  ownerRank: number,
  callback: () => void
) => {
  return async function (dispatch: Dispatch, getState: () => AppState) {
    const { housingOwners } = getState().housing;

    await updateHousingOwners(
      housingId,
      [
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
      ],
      callback
    )(dispatch);
  };
};

export const updateHousingOwners = (
  housingId: string,
  housingOwners: HousingOwner[],
  callback: () => void
) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(
      housingOwnersUpdate({
        formState: FormState.Init,
      })
    );

    await ownerService
      .updateHousingOwners(housingId, housingOwners)
      .then(async () => {
        dispatch(hideLoading());
        dispatch(
          housingOwnersUpdate({
            formState: FormState.Succeed,
          })
        );
        await getHousingOwners(housingId)(dispatch);
        callback();
      });
  };
};

export const changeAdditionalOwnersSearching = (q: string) => {
  return async function (dispatch: Dispatch, getState: () => AppState) {
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

    await ownerService
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
  return async function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const q = getState().housing.additionalOwners?.q ?? '';

    dispatch(
      fetchingAdditionalOwners({
        page: page,
        perPage,
        q,
      })
    );

    await ownerService
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
