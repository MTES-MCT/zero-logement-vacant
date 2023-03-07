import {
  ContactPointListFetchedAction,
  GeoPerimeterFileUploadingAction,
  GeoPerimeterListFetchedAction,
  LocalityListFetchedAction,
} from '../actions/establishmentAction';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import { ContactPoint } from '../../models/ContactPoint';
import { Locality } from '../../models/Locality';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EstablishmentState {
  loading: boolean;
  localities?: Locality[];
  geoPerimeters?: GeoPerimeter[];
  geoPerimeterFile?: File;
  geoPerimeterFilename?: string;
  contactPoints?: ContactPoint[];
}

const initialState: EstablishmentState = {
  loading: false,
};

const establishmentSlice = createSlice({
  name: 'establishment',
  initialState,
  reducers: {
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
    fetchGeoPerimeterList: (state: EstablishmentState) => {
      state.loading = true;
      state.geoPerimeters = [];
    },
    geoPerimeterListFetched: (
      state: EstablishmentState,
      action: PayloadAction<GeoPerimeterListFetchedAction>
    ) => {
      state.loading = false;
      state.geoPerimeters = action.payload.geoPerimeters;
    },
    geoPerimeterFileUploading: (
      state: EstablishmentState,
      action: PayloadAction<GeoPerimeterFileUploadingAction>
    ) => {
      state.loading = true;
      state.geoPerimeterFile = action.payload.file;
      state.geoPerimeterFilename = action.payload.filename;
    },
    geoPerimeterFileUploaded: (state: EstablishmentState) => {
      state.loading = false;
      state.geoPerimeterFile = undefined;
      state.geoPerimeterFilename = undefined;
    },
    fetchContactPointList: (state: EstablishmentState) => {
      state.loading = true;
      state.contactPoints = [];
    },
    contactPointListFetched: (
      state: EstablishmentState,
      action: PayloadAction<ContactPointListFetchedAction>
    ) => {
      state.loading = false;
      state.contactPoints = action.payload.contactPoints;
    },
  },
});

export default establishmentSlice;
