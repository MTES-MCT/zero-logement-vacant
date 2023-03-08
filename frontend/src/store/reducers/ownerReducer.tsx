import { Owner } from '../../models/Owner';
import {
  OwnerEventsFetchedAction,
  OwnerFetchedAction,
  OwnerHousingFetchedAction,
  OwnerUpdatedAction,
} from '../actions/ownerAction';
import { Event } from '../../models/Event';
import { Housing, housingSort } from '../../models/Housing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OwnerState {
  owner?: Owner;
  housingList?: Housing[];
  housingTotalCount?: number;
  events?: Event[];
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
    fetchingOwnerEvents: (state: OwnerState) => {
      state.events = [];
    },
    ownerEventsFetched: (
      state: OwnerState,
      action: PayloadAction<OwnerEventsFetchedAction>
    ) => {
      state.events = action.payload.events;
    },
  },
});

export default ownerSlice;
