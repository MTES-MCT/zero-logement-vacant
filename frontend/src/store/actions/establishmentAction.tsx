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
import { Establishment } from '../../models/Establishment';
import establishmentService from '../../services/establishment.service';

export interface EstablishmentFetchedAction {
  establishment: Establishment;
}

export interface NearbyEstablishmentsFetchedAction {
  nearbyEstablishments: Establishment[];
}

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
  fetchEstablishment,
  establishmentFetched,
  fetchNearbyEstablishments,
  nearbyEstablishmentFetched,
  fetchLocalityList,
  contactPointListFetched,
  fetchContactPointList,
  fetchGeoPerimeterList,
  geoPerimeterListFetched,
  geoPerimeterFileUploading,
  geoPerimeterFileUploaded,
  localityListFetched,
} = establishmentSlice.actions;

export const getEstablishment = (name: string, geoCode?: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchEstablishment());

    establishmentService
      .listEstablishments({
        geoCodes: geoCode ? [geoCode] : undefined,
        name,
      })
      .then((establishments) => {
        dispatch(hideLoading());
        dispatch(
          establishmentFetched({
            establishment: establishments[0],
          })
        );
      });
  };
};

export const getNearbyEstablishments = (establishment: Establishment) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchNearbyEstablishments());

    const epci =
      establishment.kind === 'Commune'
        ? await establishmentService
            .listEstablishments({
              geoCodes: [establishment.geoCodes[0]],
              kind: 'EPCI',
            })
            .then((establishments) => establishments[0])
        : establishment.kind === 'EPCI'
        ? establishment
        : undefined;

    if (epci) {
      establishmentService
        .listEstablishments({
          geoCodes: epci.geoCodes,
          kind: 'Commune',
        })
        .then((establishments) => {
          dispatch(hideLoading());
          dispatch(
            nearbyEstablishmentFetched({
              nearbyEstablishments: establishments.filter((_) =>
                establishment.kind === 'Commune'
                  ? !_.geoCodes.includes(establishment.geoCodes[0])
                  : true
              ),
            })
          );
        });
    } else {
      dispatch(
        nearbyEstablishmentFetched({
          nearbyEstablishments: [],
        })
      );
    }
  };
};
export const fetchLocalities = (establishmentId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchLocalityList());

    localityService.listLocalities(establishmentId).then((localities) => {
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
  establishmentId: string,
  geoCode: string,
  taxKind: TaxKinds,
  taxRate?: number
) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    localityService.updateLocalityTax(geoCode, taxKind, taxRate).then(() => {
      dispatch(hideLoading());
      fetchLocalities(establishmentId)(dispatch);
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

export const fetchContactPoints = (establishmentId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    dispatch(fetchContactPointList());

    contactPointService.find(establishmentId).then((contactPoints) => {
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
      fetchContactPoints(draftContactPoint.establishmentId)(dispatch);
    });
  };
};

export const updateContactPoint = (contactPoint: ContactPoint) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.update(contactPoint).then(() => {
      dispatch(hideLoading());
      fetchContactPoints(contactPoint.establishmentId)(dispatch);
    });
  };
};

export const deleteContactPoint = (contactPoint: ContactPoint) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    contactPointService.remove(contactPoint.id).then(() => {
      dispatch(hideLoading());
      fetchContactPoints(contactPoint.establishmentId)(dispatch);
    });
  };
};
