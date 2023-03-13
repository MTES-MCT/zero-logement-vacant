import { Dispatch } from 'redux';
import geoService from '../../services/geo.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import {
  ContactPoint,
  DraftContactPoint,
} from '../../../../shared/models/ContactPoint';
import contactPointService from '../../services/contact-point.service';
import { Locality, TaxKinds } from '../../models/Locality';
import localityService from '../../services/locality.service';
import establishmentSlice from '../reducers/establishmentReducer';

export interface LocalityListFetchedAction {
  localities: Locality[];
}

export interface GeoPerimeterListFetchedAction {
  geoPerimeters: GeoPerimeter[];
}

export interface GeoPerimeterFileUploadingAction {
  file: File;
  filename: string;
}

export interface ContactPointListFetchedAction {
  contactPoints: ContactPoint[];
}

const {
  fetchLocalityList,
  contactPointListFetched,
  fetchContactPointList,
  fetchGeoPerimeterList,
  geoPerimeterListFetched,
  geoPerimeterFileUploading,
  geoPerimeterFileUploaded,
  localityListFetched,
} = establishmentSlice.actions;

export const fetchLocalities = () => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchLocalityList());

    localityService.listLocalities().then((localities) => {
      dispatch(hideLoading());
      dispatch(
        localityListFetched({
          localities,
        })
      );
    });
  };
};

export const fetchGeoPerimeters = () => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchGeoPerimeterList());

    geoService.listGeoPerimeters().then((geoPerimeters) => {
      dispatch(hideLoading());
      dispatch(
        geoPerimeterListFetched({
          geoPerimeters,
        })
      );
    });
  };
};

export const updateLocalityTax = (
  geoCode: string,
  taxKind: TaxKinds,
  taxRate?: number
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    localityService.updateLocalityTax(geoCode, taxKind, taxRate).then(() => {
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

    dispatch(geoPerimeterFileUploading({ file, filename: file.name }));

    geoService.uploadGeoPerimeterFile(file).then(() => {
      dispatch(hideLoading());
      dispatch(geoPerimeterFileUploaded());
      fetchGeoPerimeters()(dispatch);
    });
  };
};

export const fetchContactPoints = () => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchContactPointList());

    contactPointService.find().then((contactPoints) => {
      dispatch(hideLoading());
      dispatch(
        contactPointListFetched({
          contactPoints,
        })
      );
    });
  };
};

export const createContactPoint = (draftContactPoint: DraftContactPoint) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.create(draftContactPoint).then(() => {
      dispatch(hideLoading());
      fetchContactPoints()(dispatch);
    });
  };
};

export const updateContactPoint = (contactPoint: ContactPoint) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.update(contactPoint).then(() => {
      dispatch(hideLoading());
      fetchContactPoints()(dispatch);
    });
  };
};

export const deleteContactPoint = (contactPointId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.remove(contactPointId).then(() => {
      dispatch(hideLoading());
      fetchContactPoints()(dispatch);
    });
  };
};
