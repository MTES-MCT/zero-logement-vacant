import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddressSearchResult } from '../../services/address.service';

export interface OwnerProspectState {
  addressSearchResult?: AddressSearchResult;
}

const initialState: OwnerProspectState = {};

const ownerProspectSlice = createSlice({
  name: 'ownerProspect',
  initialState,
  reducers: {
    selectAddress: (
      state: OwnerProspectState,
      action: PayloadAction<AddressSearchResult>
    ) => {
      state.addressSearchResult = action.payload;
    },
  },
});

export default ownerProspectSlice;
