import { HousingSort, OccupancyKind } from '../../models/Housing';
import { HousingFilters } from '../../models/HousingFilters';
import config from '../../utils/config';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Pagination } from '../../../../shared/models/Pagination';

export type ViewMode = 'list' | 'map';
export interface HousingState {
  filteredCount: number;
  totalCount: number;
  totalOwnerCount: number;
  pagination?: Pagination;
  sort?: HousingSort;
  filters: HousingFilters;
  filtersExpanded: boolean;
  additionalOwnersQuery?: {
    page: number;
    perPage: number;
    q: string;
  };
  view: ViewMode;
}

export const initialHousingFilters = {
  dataYearsIncluded: [config.dataYear + 1],
  occupancies: [OccupancyKind.Vacant],
} as HousingFilters;

const initialState: HousingState = {
  filteredCount: 0,
  totalCount: 0,
  totalOwnerCount: 0,
  pagination: {
    page: 1,
    perPage: config.perPageDefault,
  },
  filters: initialHousingFilters,
  filtersExpanded: false,
  view: 'list',
};

const housingSlice = createSlice({
  name: 'housing',
  initialState,
  reducers: {
    expandFilters: (state: HousingState, action: PayloadAction<boolean>) => {
      state.filtersExpanded = action.payload;
    },
    changeFilters: (
      state: HousingState,
      action: PayloadAction<HousingFilters>
    ) => {
      state.filters = action.payload;
    },
    changePagination: (
      state: HousingState,
      action: PayloadAction<Pagination>
    ) => {
      state.pagination = action.payload;
    },
    changeSort: (state: HousingState, action: PayloadAction<HousingSort>) => {
      state.sort = action.payload;
    },
    changeView: (state: HousingState, action: PayloadAction<ViewMode>) => {
      state.view = action.payload;
      state.pagination = {
        ...state.pagination,
        paginate: action.payload === 'list',
      };
    },
    fetchingAdditionalOwners: (
      state: HousingState,
      action: PayloadAction<{
        q: string;
        page: number;
        perPage: number;
      }>
    ) => {
      state.additionalOwnersQuery = {
        page: action.payload.page,
        perPage: action.payload.perPage,
        q: action.payload.q,
      };
    },
  },
});

export default housingSlice;
