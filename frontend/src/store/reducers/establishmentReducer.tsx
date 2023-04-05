import {
  EstablishmentFetchedAction,
  LocalityListFetchedAction,
  NearbyEstablishmentsFetchedAction,
} from '../actions/establishmentAction';
import { Locality } from '../../models/Locality';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Establishment } from '../../models/Establishment';

export interface EstablishmentState {
  loading: boolean;
  establishment?: Establishment;
  epciEstablishment?: Establishment;
  nearbyEstablishments?: Establishment[];
  localities?: Locality[];
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
    fetchLocalityList: (state: EstablishmentState) => {
      state.loading = true;
      state.localities = [];
    },
    localityListFetched: (
      state: EstablishmentState,
      action: PayloadAction<LocalityListFetchedAction>
    ) => {
      state.loading = false;
      state.localities = action.payload.localities;
    },
  },
});

export default establishmentSlice;
