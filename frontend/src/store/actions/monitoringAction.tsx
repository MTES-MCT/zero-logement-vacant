import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { EstablishmentData } from '../../models/Establishment';
import monitoringService from '../../services/monitoring.service';
import {
  FirstContactToContactedSubStatus,
  HousingStatus,
  HousingStatusCount,
  HousingStatusDuration,
} from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';
import housingService from '../../services/housing.service';
import config from '../../utils/config';
import { PaginationApi } from '../../../../server/models/PaginationApi';
import monitoringSlice from '../reducers/monitoringReducer';
import { Pagination } from '../../../../shared/models/Pagination';

export interface FetchHousingByStatusCountAction {
  filters: MonitoringFilters;
}

export interface HousingByStatusCountFetchedAction {
  housingByStatusCount: HousingStatusCount[];
  filters: MonitoringFilters;
}

export interface FetchHousingByStatusDurationAction {
  filters: MonitoringFilters;
}

export interface HousingByStatusDurationFetchedAction {
  housingByStatusDuration: HousingStatusDuration[];
  filters: MonitoringFilters;
}

export interface FetchHousingToContactAction {
  filters: MonitoringFilters;
  page: number;
  perPage: number;
}

export interface HousingToContactFetchedAction {
  filters: MonitoringFilters;
  paginatedHousing: PaginatedResult<Housing>;
}

export interface FetchingEstablishmentDataAction {
  filters: MonitoringFilters;
}

export interface EstablishmentDataFetchedAction {
  establishmentData: EstablishmentData[];
  filters: MonitoringFilters;
}

const {
  fetchingEstablishmentData,
  establishmentDataFetched,
  fetchingHousingToContact,
  fetchingHousingByStatusDuration,
  fetchingHousingByStatusCount,
  housingToContactFetchedAction,
  housingByStatusDurationFetched,
  housingByStatusCountFetched,
} = monitoringSlice.actions;

export const fetchEstablishmentData = (filters: MonitoringFilters) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(
      fetchingEstablishmentData({
        filters,
      })
    );

    monitoringService
      .listEstablishmentData(filters)
      .then((establishmentData) => {
        dispatch(hideLoading());
        dispatch(
          establishmentDataFetched({
            establishmentData,
            filters,
          })
        );
      });
  };
};

export const fetchHousingByStatusCount = (filters: MonitoringFilters) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(
      fetchingHousingByStatusCount({
        filters,
      })
    );

    Promise.all([
      monitoringService
        .getHousingByStatusCount(filters)
        .then((housingByStatusCount) => {
          dispatch(
            housingByStatusCountFetched({
              housingByStatusCount,
              filters,
            })
          );
        }),
    ]).then(() => dispatch(hideLoading()));
  };
};

export const fetchHousingByStatusDuration = (filters: MonitoringFilters) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(
      fetchingHousingByStatusDuration({
        filters,
      })
    );

    Promise.all([
      monitoringService
        .getHousingByStatusDuration(filters)
        .then((housingByStatusDuration) => {
          dispatch(
            housingByStatusDurationFetched({
              housingByStatusDuration,
              filters,
            })
          );
        }),
    ]).then(() => dispatch(hideLoading()));
  };
};

export const fetchHousingToContact = (
  filters: MonitoringFilters,
  page: number = 1,
  perPage: number = config.perPageDefault
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    const pagination: Pagination = { page, perPage };

    dispatch(
      fetchingHousingToContact({
        filters,
        page,
        perPage,
      })
    );

    housingService
      .listHousing(
        {
          establishmentIds: filters.establishmentIds,
          status: [HousingStatus.FirstContact],
          subStatus: [FirstContactToContactedSubStatus],
        },
        {},
        { pagination }
      )
      .then((result: PaginatedResult<Housing>) => {
        dispatch(hideLoading());
        dispatch(
          housingToContactFetchedAction({
            paginatedHousing: result,
            filters,
          })
        );
      });
  };
};
