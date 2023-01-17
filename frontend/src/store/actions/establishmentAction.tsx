import { Dispatch } from 'redux';
import geoService from '../../services/geo.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import { ContactPoint, DraftContactPoint } from '../../models/ContactPoint';
import contactPointService from '../../services/contact-point.service';
import { Locality } from '../../models/Locality';
import localityService from '../../services/locality.service';

export const FETCH_LOCALITY_LIST = 'FETCH_LOCALITY_LIST';
export const LOCALITY_LIST_FETCHED = 'LOCALITY_LIST_FETCHED';
export const FETCH_GEO_PERIMETER_LIST = 'FETCH_GEO_PERIMETER_LIST';
export const GEO_PERIMETER_LIST_FETCHED = 'GEO_PERIMETER_LIST_FETCHED';
export const GEO_PERIMETER_FILE_UPLOADING = 'GEO_PERIMETER_FILE_UPLOADING';
export const GEO_PERIMETER_FILE_UPLOADED = 'GEO_PERIMETER_FILE_UPLOADED';
export const FETCH_CONTACT_POINT_LIST = 'FETCH_CONTACT_POINT_LIST';
export const CONTACT_POINT_LIST_FETCHED = 'CONTACT_POINT_LIST_FETCHED';

export interface FetchLocalityListAction {
  type: typeof FETCH_LOCALITY_LIST;
}

export interface LocalityListFetchedAction {
  type: typeof LOCALITY_LIST_FETCHED;
  localities: Locality[];
}
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

export interface FetchContactPointListAction {
  type: typeof FETCH_CONTACT_POINT_LIST;
}

export interface ContactPointListFetchedAction {
  type: typeof CONTACT_POINT_LIST_FETCHED;
  contactPoints: ContactPoint[];
}

export type EstablishmentActionTypes =
  | GeoPerimeterFileUploadingAction
  | GeoPerimeterFileUploadedAction
  | FetchLocalityListAction
  | LocalityListFetchedAction
  | FetchGeoPerimeterListAction
  | GeoPerimeterListFetchedAction
  | FetchContactPointListAction
  | ContactPointListFetchedAction;

export const fetchLocalities = () => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: FETCH_LOCALITY_LIST,
    });

    localityService.listLocalities().then((localities) => {
      dispatch(hideLoading());
      dispatch({
        type: LOCALITY_LIST_FETCHED,
        localities,
      });
    });
  };
};

export const fetchGeoPerimeters = () => {
  return function (dispatch: Dispatch) {
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
  };
};

export const updateLocalityTax = (geoCode: string, taxRate?: number) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    localityService.updateLocalityTax(geoCode, taxRate).then(() => {
      dispatch(hideLoading());
      fetchLocalities()(dispatch);
    });
  };
};

export const updateGeoPerimeter = (
  geoPerimeterId: string,
  kind: string,
  name?: string
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    geoService.updateGeoPerimeter(geoPerimeterId, kind, name).then(() => {
      dispatch(hideLoading());
      fetchGeoPerimeters()(dispatch);
    });
  };
};

export const deleteGeoPerimeter = (geoPerimeterId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    geoService.deleteGeoPerimeter(geoPerimeterId).then(() => {
      dispatch(hideLoading());
      fetchGeoPerimeters()(dispatch);
    });
  };
};

export const uploadFile = (file: File) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: GEO_PERIMETER_FILE_UPLOADING,
    });

    geoService.uploadGeoPerimeterFile(file).then(() => {
      dispatch(hideLoading());
      dispatch({
        type: GEO_PERIMETER_FILE_UPLOADED,
      });
      fetchGeoPerimeters()(dispatch);
    });
  };
};

export const fetchContactPoints = () => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch({
      type: FETCH_CONTACT_POINT_LIST,
    });

    contactPointService.listContactPoints().then((contactPoints) => {
      dispatch(hideLoading());
      dispatch({
        type: CONTACT_POINT_LIST_FETCHED,
        contactPoints,
      });
    });
  };
};

export const createContactPoint = (draftContactPoint: DraftContactPoint) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.createContactPoint(draftContactPoint).then(() => {
      dispatch(hideLoading());
      fetchContactPoints()(dispatch);
    });
  };
};

export const updateContactPoint = (contactPoint: ContactPoint) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.updateContactPoint(contactPoint).then(() => {
      dispatch(hideLoading());
      fetchContactPoints()(dispatch);
    });
  };
};

export const deleteContactPoint = (contactPointId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.deleteContactPoint(contactPointId).then(() => {
      dispatch(hideLoading());
      fetchContactPoints()(dispatch);
    });
  };
};
