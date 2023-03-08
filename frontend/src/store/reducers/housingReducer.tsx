import { Housing, HousingSort } from '../../models/Housing';
import {
  AdditionalOwnersFetchedAction,
  ExpandFiltersAction,
  FetchingAdditionalOwnersAction,
  FetchingHousingListAction,
  HousingEventsFetchedAction,
  HousingFetchedAction,
  HousingListFetchedAction,
  HousingOwnersFetchedAction,
  HousingOwnersUpdateAction,
} from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';
import {
  initialPaginatedResult,
  PaginatedResult,
} from '../../models/PaginatedResult';
import config from '../../utils/config';
import { HousingOwner, Owner } from '../../models/Owner';
import { Event } from '../../models/Event';
import { FormState } from '../actions/FormState';
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';

export interface HousingState {
  paginate?: boolean;
  paginatedHousing: PaginatedResult<Housing>;
  filters: HousingFilters;
  filtersExpanded: boolean;
  housing?: Housing;
  housingOwners?: HousingOwner[];
  additionalOwners?: {
    paginatedOwners: PaginatedResult<Owner>;
    q?: string;
  };
  events?: Event[];
  checkedHousingIds?: string[];
  housingOwnersUpdateFormState?: FormState;
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
  vacancyDurations: [],
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
    fetchingHousingOwners: (state: HousingState) => {
      state.housingOwners = undefined;
    },
    housingOwnersFetched: (
      state: HousingState,
      action: PayloadAction<HousingOwnersFetchedAction>
    ) => {
      state.housingOwners = action.payload.housingOwners;
    },
    fetchingAdditionalOwners: (
      state: HousingState,
      action: PayloadAction<FetchingAdditionalOwnersAction>
    ) => {
      state.additionalOwners = {
        paginatedOwners: {
          ...initialPaginatedResult(),
          page: action.payload.page,
          perPage: action.payload.perPage,
          loading: true,
        },
        q: action.payload.q,
      };
    },
    additionalOwnersFetched: (
      state: HousingState,
      action: PayloadAction<AdditionalOwnersFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.q === current(state).additionalOwners?.q &&
        action.payload.paginatedOwners.page ===
          current(state).additionalOwners?.paginatedOwners.page &&
        action.payload.paginatedOwners.perPage ===
          current(state).additionalOwners?.paginatedOwners.perPage;
      if (isCurrentFetching) {
        state.additionalOwners = {
          ...current(state).additionalOwners,
          paginatedOwners: {
            ...(current(state).additionalOwners?.paginatedOwners ??
              initialPaginatedResult()),
            entities: action.payload.paginatedOwners.entities,
            filteredCount: action.payload.paginatedOwners.filteredCount,
            totalCount: action.payload.paginatedOwners.totalCount,
            loading: false,
          },
        };
      }
    },
    fetchingHousingEvents: (state: HousingState) => {
      state.events = [];
    },
    housingEventsFetched: (
      state: HousingState,
      action: PayloadAction<HousingEventsFetchedAction>
    ) => {
      state.events = action.payload.events;
    },
    housingOwnersUpdate: (
      state: HousingState,
      action: PayloadAction<HousingOwnersUpdateAction>
    ) => {
      state.housingOwnersUpdateFormState = action.payload.formState;
    },
    fetchingHousingList: (
      state: HousingState,
      action: PayloadAction<FetchingHousingListAction>
    ) => {
      state.paginate = action.payload.pagination.paginate;
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
      state.paginate = action.payload.paginate;
      state.paginatedHousing = {
        page:
          state.paginatedHousing.page ?? action.payload.paginatedHousing.page,
        perPage:
          state.paginatedHousing.perPage ??
          action.payload.paginatedHousing.perPage,
        entities: action.payload.paginatedHousing.entities,
        filteredCount: action.payload.paginatedHousing.filteredCount,
        totalCount: action.payload.paginatedHousing.totalCount,
        loading: false,
      };
      state.filters = action.payload.filters;
    },
  },
});

export default housingSlice;
