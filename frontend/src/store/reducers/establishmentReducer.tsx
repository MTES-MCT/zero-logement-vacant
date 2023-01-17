import {
  CONTACT_POINT_LIST_FETCHED,
  EstablishmentActionTypes,
  FETCH_CONTACT_POINT_LIST,
  FETCH_GEO_PERIMETER_LIST,
  FETCH_LOCALITY_LIST,
  GEO_PERIMETER_FILE_UPLOADED,
  GEO_PERIMETER_FILE_UPLOADING,
  GEO_PERIMETER_LIST_FETCHED,
  LOCALITY_LIST_FETCHED,
} from '../actions/establishmentAction';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import { ContactPoint } from '../../models/ContactPoint';
import { Locality } from '../../models/Locality';

export interface EstablishmentState {
  loading: boolean;
  localities?: Locality[];
  geoPerimeters?: GeoPerimeter[];
  file?: File;
  filename?: string;
  contactPoints?: ContactPoint[];
}

const initialState: EstablishmentState = {
  loading: false,
};

const establishmentReducer = (
  state = initialState,
  action: EstablishmentActionTypes
) => {
  switch (action.type) {
    case FETCH_LOCALITY_LIST: {
      return {
        ...state,
        loading: true,
        localities: [],
      };
    }
    case LOCALITY_LIST_FETCHED: {
      return {
        ...state,
        loading: false,
        localities: action.localities,
      };
    }
    case FETCH_GEO_PERIMETER_LIST: {
      return {
        ...state,
        loading: true,
        geoPerimeters: [],
      };
    }
    case GEO_PERIMETER_LIST_FETCHED: {
      return {
        ...state,
        loading: false,
        geoPerimeters: action.geoPerimeters,
      };
    }
    case GEO_PERIMETER_FILE_UPLOADING:
      return {
        ...state,
        loading: true,
        file: action.file,
        filename: action.filename,
      };
    case GEO_PERIMETER_FILE_UPLOADED: {
      return {
        ...state,
        loading: false,
        file: undefined,
        filename: undefined,
      };
    }
    case FETCH_CONTACT_POINT_LIST: {
      return {
        ...state,
        loading: true,
        contactPoints: [],
      };
    }
    case CONTACT_POINT_LIST_FETCHED: {
      return {
        ...state,
        loading: false,
        contactPoints: action.contactPoints,
      };
    }
    default:
      return state;
  }
};

export default establishmentReducer;
