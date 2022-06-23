import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { EstablishmentData } from '../../models/Establishment';
import establishmentService from '../../services/establishment.service';

export const FETCHING_ESTABLISHMENT_DATA = 'FETCHING_ESTABLISHMENT_DATA';
export const ESTABLISHMENT_DATA_FETCHED = 'ESTABLISHMENT_DATA_FETCHED';

export interface FetchingEstablishmentDataAction {
    type: typeof FETCHING_ESTABLISHMENT_DATA
}

export interface EstablishmentDataFetchedAction {
    type: typeof ESTABLISHMENT_DATA_FETCHED,
    establishmentData: EstablishmentData[]
}

export type MonitoringActionTypes =
    FetchingEstablishmentDataAction |
    EstablishmentDataFetchedAction;


export const fetchEstablishmentData = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_ESTABLISHMENT_DATA
        });

        establishmentService.listEstablishmentData()
            .then(establishmentData => {
                dispatch(hideLoading());
                dispatch({
                    type: ESTABLISHMENT_DATA_FETCHED,
                    establishmentData
                });
            });
    };
};
