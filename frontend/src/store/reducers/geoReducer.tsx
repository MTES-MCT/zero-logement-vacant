import {
    FETCH_GEO_PERIMETER_LIST,
    GEO_PERIMETER_FILE_UPLOADED,
    GEO_PERIMETER_FILE_UPLOADING,
    GEO_PERIMETER_LIST_FETCHED,
    GeoActionTypes,
} from '../actions/geoAction';
import { GeoPerimeter } from '../../models/GeoPerimeter';

export interface GeoState {
    loading: boolean;
    geoPerimeters?: GeoPerimeter[];
    file?: File;
    filename?: string;
}

const initialState: GeoState = {
    loading: false
};

const geoReducer = (state = initialState, action: GeoActionTypes) => {
    switch (action.type) {
        case FETCH_GEO_PERIMETER_LIST: {
            return {
                ...state,
                loading: true,
                geoPerimeters: []
            };
        }
        case GEO_PERIMETER_LIST_FETCHED: {
            return {
                ...state,
                loading: false,
                geoPerimeters: action.geoPerimeters
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
        default:
            return state;
    }
};

export default geoReducer;
