import { useEffect, useState } from 'react';
import { fetchAvailableEstablishments } from '../store/actions/authenticationAction';
import { SelectOption } from '../models/SelectOption';
import { useAppDispatch, useAppSelector } from './useStore';

export const useAvailableEstablishmentOptions = () => {
  const dispatch = useAppDispatch();
  const [availableEstablishmentOptions, setAvailableEstablishmentOptions] =
    useState<SelectOption[]>([]);
  const { availableEstablishments } = useAppSelector(
    (state) => state.authentication
  );

  useEffect(() => {
    if (!availableEstablishments) {
      dispatch(fetchAvailableEstablishments());
    } else {
      setAvailableEstablishmentOptions(
        availableEstablishments.map((establishment) => ({
          value: establishment.id,
          label: establishment.name,
        }))
      );
    }
  }, [dispatch, availableEstablishments]);

  return availableEstablishmentOptions;
};
