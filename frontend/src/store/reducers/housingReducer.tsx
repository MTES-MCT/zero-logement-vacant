import { Housing, HousingSort, OccupancyKind } from '../../models/Housing';
import {
  ExpandFiltersAction,
  FetchingAdditionalOwnersAction,
  FetchingHousingListAction,
  HousingFetchedAction,
  HousingListFetchedAction,
} from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';
import { HousingPaginatedResult } from '../../models/PaginatedResult';
import config from '../../utils/config';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface HousingState {
  paginate?: boolean;
  paginatedHousing: HousingPaginatedResult;
  filters: HousingFilters;
  filtersExpanded: boolean;
  housing?: Housing;
  checkedHousingIds?: string[];
  additionalOwnersQuery?: {
    page: number;
    perPage: number;
    q: string;
  };
  sort?: HousingSort;
}

export const initialHousingFilters = {
  ownerKinds: [],
  ownerAges: [],
  multiOwners: [],
  beneficiaryCounts: [],
  housingKinds: [],
  cadastralClassifications: [],
  housingAreas: [],
  roomsCounts: [],
  buildingPeriods: [],
  vacancyDurations: ['gt2'],
  isTaxedValues: [],
  ownershipKinds: [],
  housingCounts: [],
  vacancyRates: [],
  campaignsCounts: [],
  campaignIds: [],
  localities: [],
  localityKinds: [],
  geoPerimetersIncluded: [],
  geoPerimetersExcluded: [],
  dataYearsIncluded: [config.dataYear + 1],
  dataYearsExcluded: [],
  energyConsumption: [],
  energyConsumptionWorst: [],
  occupancies: [OccupancyKind.Vacant],
  query: '',
} as HousingFilters;

const initialState: HousingState = {
  paginate: true,
  paginatedHousing: {
    entities: [],
    page: 1,
    perPage: config.perPageDefault,
    totalCount: 0,
    filteredCount: 0,
    filteredOwnerCount: 0,
    loading: true,
  },
  filters: initialHousingFilters,
  filtersExpanded: false,
};

const housingSlice = createSlice({
  name: 'housing',
  initialState,
  reducers: {
    expandingFilters: (
      state: HousingState,
      action: PayloadAction<ExpandFiltersAction>
    ) => {
      state.filtersExpanded = action.payload.value;
    },
    fetchingHousing: (state: HousingState) => {
      state.housing = undefined;
    },
    housingFetched: (
      state: HousingState,
      action: PayloadAction<HousingFetchedAction>
    ) => {
      state.housing = action.payload.housing;
    },
    fetchingAdditionalOwners: (
      state: HousingState,
      action: PayloadAction<FetchingAdditionalOwnersAction>
    ) => {
      state.additionalOwnersQuery = {
        page: action.payload.page,
        perPage: action.payload.perPage,
        q: action.payload.q,
      };
    },
    fetchingHousingList: (
      state: HousingState,
      action: PayloadAction<FetchingHousingListAction>
    ) => {
      state.paginate = action.payload.pagination.paginate ?? state.paginate;
      state.paginatedHousing = {
        ...state.paginatedHousing,
        loading: true,
      };
      state.filters = action.payload.filters;
    },
    housingListFetched: (
      state: HousingState,
      action: PayloadAction<HousingListFetchedAction>
    ) => {
      const paginate = action.payload.paginate ?? state.paginate;
      state.paginate = paginate;
      state.paginatedHousing = {
        page: paginate
          ? action.payload.paginatedHousing.page
          : state.paginatedHousing.page,
        perPage: paginate
          ? action.payload.paginatedHousing.perPage
          : state.paginatedHousing.perPage,
        entities: action.payload.paginatedHousing.entities,
        filteredCount: action.payload.paginatedHousing.filteredCount,
        filteredOwnerCount: action.payload.paginatedHousing.filteredOwnerCount,
        totalCount: action.payload.paginatedHousing.totalCount,
        loading: false,
      };
      state.filters = action.payload.filters;
    },
  },
});

export default housingSlice;
