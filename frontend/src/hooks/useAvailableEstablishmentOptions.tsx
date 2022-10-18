import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { fetchAvailableEstablishments } from '../store/actions/authenticationAction';
import { SelectOption } from '../models/SelectOption';

export const useAvailableEstablishmentOptions = () => {

    const dispatch = useDispatch();
    const [availableEstablishmentOptions, setAvailableEstablishmentOptions] = useState<SelectOption[]>([]);
    const { availableEstablishments } = useSelector((state: ApplicationState) => state.authentication);


    useEffect(() => {
        if (!availableEstablishments) {
            dispatch(fetchAvailableEstablishments())
        } else {
            setAvailableEstablishmentOptions(availableEstablishments.map(establishment => ({
                value: establishment.id,
                label: establishment.name
            })))
        }
    }, [dispatch, availableEstablishments]);

    return availableEstablishmentOptions;
}
