import {
  EstablishmentFetchedAction,
  NearbyEstablishmentsFetchedAction,
} from '../actions/establishmentAction';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Establishment } from '../../models/Establishment';

export interface EstablishmentState {
  loading: boolean;
  establishment?: Establishment;
  epciEstablishment?: Establishment;
  nearbyEstablishments?: Establishment[];
}

const initialState: EstablishmentState = {
  loading: false,
};

const establishmentSlice = createSlice({
  name: 'establishment',
  initialState,
  reducers: {
    fetchEstablishment: (state: EstablishmentState) => {
      state.establishment = undefined;
    },
    establishmentFetched: (
      state: EstablishmentState,
      action: PayloadAction<EstablishmentFetchedAction>
    ) => {
      state.establishment = action.payload.establishment;
    },
    fetchNearbyEstablishments: (state: EstablishmentState) => {
      state.nearbyEstablishments = undefined;
      state.epciEstablishment = undefined;
    },
    nearbyEstablishmentFetched: (
      state: EstablishmentState,
      action: PayloadAction<NearbyEstablishmentsFetchedAction>
    ) => {
      state.nearbyEstablishments = action.payload.nearbyEstablishments;
      state.epciEstablishment = action.payload.epciEstablishment;
    },
  },
});

export default establishmentSlice;
