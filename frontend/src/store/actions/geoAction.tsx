import { Dispatch } from 'redux';
import geoService from '../../services/geo.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import { ApplicationState } from '../reducers/applicationReducers';

export const FETCH_GEO_PERIMETER_LIST = 'FETCH_GEO_PERIMETER_LIST';
export const GEO_PERIMETER_LIST_FETCHED = 'GEO_PERIMETER_LIST_FETCHED';
export const GEO_PERIMETER_FILE_UPLOADING = 'GEO_PERIMETER_FILE_UPLOADING';
export const GEO_PERIMETER_FILE_UPLOADED = 'GEO_PERIMETER_FILE_UPLOADED';

export interface FetchGeoPerimeterListAction {
  type: typeof FETCH_GEO_PERIMETER_LIST;
}

export interface GeoPerimeterListFetchedAction {
  type: typeof GEO_PERIMETER_LIST_FETCHED;
  geoPerimeters: GeoPerimeter[];
}

export interface GeoPerimeterFileUploadingAction {
  type: typeof GEO_PERIMETER_FILE_UPLOADING;
  file: File;
  filename: string;
}

export interface GeoPerimeterFileUploadedAction {
  type: typeof GEO_PERIMETER_FILE_UPLOADED;
}

export type GeoActionTypes =
  | GeoPerimeterFileUploadingAction
  | GeoPerimeterFileUploadedAction
  | FetchGeoPerimeterListAction
  | GeoPerimeterListFetchedAction;

export const fetchGeoPerimeters = () => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    if (!getState().geo.loading) {
      dispatch(showLoading());

      dispatch({
        type: FETCH_GEO_PERIMETER_LIST,
      });

      geoService.listGeoPerimeters().then((geoPerimeters) => {
        dispatch(hideLoading());
        dispatch({
          type: GEO_PERIMETER_LIST_FETCHED,
          geoPerimeters,
        });
      });
    }
  };
};

export const updateGeoPerimeter = (
  geoPerimeterId: string,
  kind: string,
  name?: string
) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    geoService.updateGeoPerimeter(geoPerimeterId, kind, name).then(() => {
      dispatch(hideLoading());
      fetchGeoPerimeters()(dispatch, getState);
    });
  };
};

export const deleteGeoPerimeter = (geoPerimeterId: string) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    geoService.deleteGeoPerimeter(geoPerimeterId).then(() => {
      dispatch(hideLoading());
      fetchGeoPerimeters()(dispatch, getState);
    });
  };
};

export const uploadFile = (file: File) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    dispatch({
      type: GEO_PERIMETER_FILE_UPLOADING,
    });

    geoService.uploadGeoPerimeterFile(file).then(() => {
      dispatch(hideLoading());
      dispatch({
        type: GEO_PERIMETER_FILE_UPLOADED,
      });
      fetchGeoPerimeters()(dispatch, getState);
    });
  };
};
