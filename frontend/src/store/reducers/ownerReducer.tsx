import { Owner } from '../../models/Owner';
import { OwnerHousingFetchedAction } from '../actions/ownerAction';
import { Housing, housingSort } from '../../models/Housing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OwnerState {
  owner?: Owner;
  housingList?: Housing[];
  housingTotalCount?: number;
}

const initialState: OwnerState = {};

const ownerSlice = createSlice({
  name: 'owner',
  initialState,
  reducers: {
    fetchingOwnerHousing: (state: OwnerState) => {
      state.housingList = [];
    },
    ownerHousingFetched: (
      state: OwnerState,
      action: PayloadAction<OwnerHousingFetchedAction>
    ) => {
      state.housingList = action.payload.housingList.sort(housingSort);
      state.housingTotalCount = action.payload.housingTotalCount;
    },
  },
});

export default ownerSlice;
