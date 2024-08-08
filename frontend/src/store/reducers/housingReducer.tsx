import { OccupancyKind } from '../../models/Housing';
import { HousingFilters } from '../../models/HousingFilters';
import config from '../../utils/config';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Pagination } from '@zerologementvacant/models';
import { DatafoncierHousing } from '../../../../shared';

export type ViewMode = 'list' | 'map';

export const DefaultPagination: Pagination = {
  paginate: true,
  page: 1,
  perPage: config.perPageDefault,
};

export interface HousingState {
  totalCount: number;
  totalOwnerCount: number;
  filters: HousingFilters;
  filtersExpanded: boolean;
  additionalOwnersQuery?: {
    page: number;
    perPage: number;
    q: string;
  };
  view: ViewMode;
  creator: {
    localId?: string;
    geoCode?: string;
    housingList?: DatafoncierHousing[];
  };
}

export const initialHousingFilters = {
  dataFileYearsIncluded: [config.dataFileYear + 1],
  occupancies: [OccupancyKind.Vacant],
} as HousingFilters;

const initialState: HousingState = {
  totalCount: 0,
  totalOwnerCount: 0,
  filters: initialHousingFilters,
  filtersExpanded: true,
  view: 'list',
  creator: {},
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
      action: PayloadAction<HousingFilters>,
    ) => {
      state.filters = action.payload;
    },
    changeView: (state: HousingState, action: PayloadAction<ViewMode>) => {
      state.view = action.payload;
    },
    fetchingAdditionalOwners: (
      state: HousingState,
      action: PayloadAction<{
        q: string;
        page: number;
        perPage: number;
      }>,
    ) => {
      state.additionalOwnersQuery = {
        page: action.payload.page,
        perPage: action.payload.perPage,
        q: action.payload.q,
      };
    },
    changeCreator: (
      state: HousingState,
      action: PayloadAction<CreatorPayload>,
    ) => {
      state.creator = {
        ...state.creator,
        ...action.payload,
      };
    },
  },
});

export interface CreatorPayload {
  localId?: string;
  geoCode?: string;
  housingList?: DatafoncierHousing[];
}

export default housingSlice;
