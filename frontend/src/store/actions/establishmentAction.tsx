import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
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

const {
  fetchEstablishment,
  establishmentFetched,
  fetchNearbyEstablishments,
  nearbyEstablishmentFetched,
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
