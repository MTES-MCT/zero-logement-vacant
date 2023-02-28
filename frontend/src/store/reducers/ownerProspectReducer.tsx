import { Locality } from '../../models/Locality';
import {
  LocalityFetchedAction,
  OwnerProspectCreatedAction,
} from '../actions/ownerProspectAction';
import { OwnerProspect } from '../../models/OwnerProspect';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Establishment } from '../../models/Establishment';
import { AddressSearchResult } from '../../services/address.service';

export interface OwnerProspectState {
  addressSearchResult?: AddressSearchResult;
  locality?: Locality;
  establishment?: Establishment;
  nearbyEstablishments?: Establishment[];
  ownerProspect?: OwnerProspect;
}

const initialState: OwnerProspectState = {};

const ownerProspectSlice = createSlice({
  name: 'ownerProspect',
  initialState,
  reducers: {
    fetchingLocality: (state: OwnerProspectState) => {
      state.locality = undefined;
    },
    localityFetched: (
      state: OwnerProspectState,
      action: PayloadAction<LocalityFetchedAction>
    ) => {
      state.locality = action.payload.locality;
    },
    ownerProspectCreated: (
      state: OwnerProspectState,
      action: PayloadAction<OwnerProspectCreatedAction>
    ) => {
      state.ownerProspect = action.payload.ownerProspect;
    },
  },
});

export default ownerProspectSlice;
