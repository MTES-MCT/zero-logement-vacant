import {
  AddressSelectedAction,
  OwnerProspectCreatedAction,
  OwnerProspectsFetchedAction,
  OwnerProspectUpdatedAction,
} from '../actions/ownerProspectAction';
import { OwnerProspect } from '../../models/OwnerProspect';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddressSearchResult } from '../../services/address.service';
import { PaginatedResult } from '../../models/PaginatedResult';

export interface OwnerProspectState {
  addressSearchResult?: AddressSearchResult;
  ownerProspect?: OwnerProspect;
  ownerProspects?: PaginatedResult<OwnerProspect>;
}

const initialState: OwnerProspectState = {};

const ownerProspectSlice = createSlice({
  name: 'ownerProspect',
  initialState,
  reducers: {
    addressSelected: (
      state: OwnerProspectState,
      action: PayloadAction<AddressSelectedAction>
    ) => {
      state.addressSearchResult = action.payload.addressSearchResult;
    },
    ownerProspectCreated: (
      state: OwnerProspectState,
      action: PayloadAction<OwnerProspectCreatedAction>
    ) => {
      state.ownerProspect = action.payload.ownerProspect;
    },
    ownerProspectsFetched: (
      state: OwnerProspectState,
      action: PayloadAction<OwnerProspectsFetchedAction>
    ) => {
      state.ownerProspects = action.payload.ownerProspects;
    },
    ownerProspectUpdated: (
      state: OwnerProspectState,
      action: PayloadAction<OwnerProspectUpdatedAction>
    ) => {
      if (state.ownerProspects?.entities) {
        state.ownerProspects.entities = state.ownerProspects.entities.map(
          (entity) => {
            if (entity.id === action.payload.ownerProspect.id) {
              return action.payload.ownerProspect;
            }
            return entity;
          }
        );
      }
    },
  },
});

export default ownerProspectSlice;
