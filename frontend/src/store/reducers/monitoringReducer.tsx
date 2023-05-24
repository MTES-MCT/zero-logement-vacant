import { EstablishmentData } from '../../models/Establishment';
import {
  EstablishmentDataFetchedAction,
  FetchHousingByStatusCountAction,
  FetchHousingToContactAction,
  FetchingEstablishmentDataAction,
  HousingByStatusCountFetchedAction,
  HousingToContactFetchedAction,
} from '../actions/monitoringAction';
import { HousingStatusCount } from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';
import config from '../../utils/config';
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';

export interface MonitoringState {
  housingByStatusCount?: HousingStatusCount[];
  paginatedHousingToContact: PaginatedResult<Housing>;
  establishmentData?: EstablishmentData[];
  housingByStatusCountFilters: MonitoringFilters;
  housingByStatusDurationFilters: MonitoringFilters;
  establishmentDataFilters: MonitoringFilters;
  paginatedHousingToContactFilters: MonitoringFilters;
}

export const initialMonitoringFilters = {
  establishmentIds: [],
  dataYears: [2022],
} as MonitoringFilters;

const initialState: MonitoringState = {
  paginatedHousingToContact: {
    entities: [],
    page: 1,
    perPage: config.perPageDefault,
    totalCount: 0,
    filteredCount: 0,
    loading: true,
  },
  housingByStatusCountFilters: initialMonitoringFilters,
  housingByStatusDurationFilters: initialMonitoringFilters,
  establishmentDataFilters: initialMonitoringFilters,
  paginatedHousingToContactFilters: initialMonitoringFilters,
};

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    fetchingHousingByStatusCount: (
      state: MonitoringState,
      action: PayloadAction<FetchHousingByStatusCountAction>
    ) => {
      state.housingByStatusCountFilters = action.payload.filters;
    },
    housingByStatusCountFetched: (
      state: MonitoringState,
      action: PayloadAction<HousingByStatusCountFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.filters === current(state).housingByStatusCountFilters;
      if (isCurrentFetching) {
        state.housingByStatusCount = action.payload.housingByStatusCount;
      }
    },
    fetchingHousingToContact: (
      state: MonitoringState,
      action: PayloadAction<FetchHousingToContactAction>
    ) => {
      state.paginatedHousingToContact = {
        entities: [],
        totalCount: 0,
        filteredCount: 0,
        page: action.payload.page,
        perPage: action.payload.perPage,
        loading: true,
      };
      state.paginatedHousingToContactFilters = action.payload.filters;
    },
    housingToContactFetchedAction: (
      state: MonitoringState,
      action: PayloadAction<HousingToContactFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.filters ===
          current(state).paginatedHousingToContactFilters &&
        action.payload.paginatedHousing.page ===
          current(state).paginatedHousingToContact?.page &&
        action.payload.paginatedHousing.perPage ===
          current(state).paginatedHousingToContact?.perPage;
      if (isCurrentFetching) {
        state.paginatedHousingToContact = {
          ...current(state).paginatedHousingToContact,
          entities: action.payload.paginatedHousing.entities,
          totalCount: action.payload.paginatedHousing.totalCount,
          filteredCount: action.payload.paginatedHousing.filteredCount,
          loading: false,
        };
      }
    },
    fetchingEstablishmentData: (
      state: MonitoringState,
      action: PayloadAction<FetchingEstablishmentDataAction>
    ) => {
      state.establishmentDataFilters = action.payload.filters;
    },
    establishmentDataFetched: (
      state: MonitoringState,
      action: PayloadAction<EstablishmentDataFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.filters === current(state).establishmentDataFilters;
      if (isCurrentFetching) {
        state.establishmentData = action.payload.establishmentData;
      }
    },
  },
});

export default monitoringSlice;
