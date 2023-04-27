import { Owner } from '../../models/Owner';
import {
  OwnerFetchedAction,
  OwnerHousingFetchedAction,
  OwnerUpdatedAction,
} from '../actions/ownerAction';
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
    fetchingOwner: (state: OwnerState) => {
      state.owner = undefined;
    },
    ownerFetched: (
      state: OwnerState,
      action: PayloadAction<OwnerFetchedAction>
    ) => {
      state.owner = action.payload.owner;
    },
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
    ownerUpdated: (
      state: OwnerState,
      action: PayloadAction<OwnerUpdatedAction>
    ) => {
      state.owner = action.payload.owner;
    },
  },
});

export default ownerSlice;
