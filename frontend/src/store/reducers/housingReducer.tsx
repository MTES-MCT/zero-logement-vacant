import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DatafoncierHousing, Pagination } from '@zerologementvacant/models';
import type { Selection } from '../../hooks/useSelection';
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
  additionalOwnersQuery?: {
    page: number;
    perPage: number;
    q: string;
  };
  view: ViewMode;
  creator: {
    geoCode?: string;
    housingList?: DatafoncierHousing[];
  };
}

const initialState: HousingState = {
  selected: {
    all: false,
    ids: []
  },
  totalCount: 0,
  totalOwnerCount: 0,
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
  }
});

export default housingSlice;
