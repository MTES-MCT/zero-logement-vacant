import { Dispatch } from 'redux';
import { Housing } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';

export const FETCH_HOUSING = 'FETCH_HOUSING';

export interface FetchHousingAction {
    type: typeof FETCH_HOUSING,
    housingList: Housing[]
}

export type HousingActionTypes = FetchHousingAction;

export const listHousing = (ownerKinds?: string[], multiOwner?: boolean, age75?: boolean) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING,
            housingList: []
        });

        housingService.listHousing(ownerKinds, multiOwner, age75)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: FETCH_HOUSING,
                    housingList
                });
            });
    };
};
