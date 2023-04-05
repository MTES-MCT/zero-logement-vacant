import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
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
  epciEstablishment?: Establishment;
}

export interface LocalityListFetchedAction {
  localities: Locality[];
}

const {
  fetchEstablishment,
  establishmentFetched,
  fetchNearbyEstablishments,
  nearbyEstablishmentFetched,
  fetchLocalityList,
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
              epciEstablishment: epci,
            })
          );
        });
    } else {
      dispatch(
        nearbyEstablishmentFetched({
          nearbyEstablishments: [],
          epciEstablishment: epci,
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
