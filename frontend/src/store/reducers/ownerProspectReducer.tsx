import {
  AddressSelectedAction,
  OwnerProspectCreatedAction,
} from '../actions/ownerProspectAction';
import { OwnerProspect } from '../../models/OwnerProspect';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddressSearchResult } from '../../services/address.service';

export interface OwnerProspectState {
  addressSearchResult?: AddressSearchResult;
  ownerProspect?: OwnerProspect;
}

const initialState: OwnerProspectState = {};

const ownerProspectSlice = createSlice({
  name: 'ownerProspect',
  initialState,
  reducers: {
    ownerProspectCreated: (
      state: OwnerProspectState,
      action: PayloadAction<OwnerProspectCreatedAction>
    ) => {
      state.ownerProspect = action.payload.ownerProspect;
    },
    addressSelected: (
      state: OwnerProspectState,
      action: PayloadAction<AddressSelectedAction>
    ) => {
      state.addressSearchResult = action.payload.addressSearchResult;
    },
  },
});

export default ownerProspectSlice;
