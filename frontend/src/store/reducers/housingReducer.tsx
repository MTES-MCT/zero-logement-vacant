import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  DatafoncierHousing,
  HousingFiltersDTO,
  Pagination
} from '@zerologementvacant/models';
import { Selection } from '../../hooks/useSelection';
import { HousingFilters } from '../../models/HousingFilters';
import config from '../../utils/config';

export type ViewMode = 'list' | 'map';

export const DefaultPagination: Pagination = {
  paginate: true,
  page: 1,
  perPage: config.perPageDefault
};

export interface HousingState {
  selected: Selection;
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

export const initialHousingFilters: HousingFiltersDTO = {
  dataFileYearsIncluded: ['lovac-2025']
};

const initialState: HousingState = {
  selected: {
    all: false,
    ids: []
  },
  totalCount: 0,
  totalOwnerCount: 0,
  filters: initialHousingFilters,
  filtersExpanded: true,
  view: 'list',
  creator: {}
};

const housingSlice = createSlice({
  name: 'housing',
  initialState,
  reducers: {
    setSelected(state: HousingState, action: PayloadAction<Selection>) {
      state.selected = action.payload;
    },

    expandFilters: (state: HousingState, action: PayloadAction<boolean>) => {
      state.filtersExpanded = action.payload;
    },
    changeFilters: (
      state: HousingState,
      action: PayloadAction<HousingFilters>
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
      }>
    ) => {
      state.additionalOwnersQuery = {
        page: action.payload.page,
        perPage: action.payload.perPage,
        q: action.payload.q
      };
    },
    changeCreator: (
      state: HousingState,
      action: PayloadAction<CreatorPayload>
    ) => {
      state.creator = {
        ...state.creator,
        ...action.payload
      };
    }
  }
});

export interface CreatorPayload {
  localId?: string;
  geoCode?: string;
  housingList?: DatafoncierHousing[];
}

export default housingSlice;
