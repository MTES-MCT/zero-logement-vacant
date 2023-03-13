import { useEffect, useMemo } from 'react';
import { fetchAvailableEstablishments } from '../store/actions/authenticationAction';
import { EstablishmentKind } from '../../../shared/types/EstablishmentKind';
import { Establishment } from '../models/Establishment';
import { useAppDispatch, useAppSelector } from './useStore';

export const useEstablishments = (establishments?: Establishment[]) => {
  const dispatch = useAppDispatch();
  const { availableEstablishments } = useAppSelector(
    (state) => state.authentication
  );

  useEffect(() => {
    if (!establishments && !availableEstablishments) {
      dispatch(fetchAvailableEstablishments());
    }
  }, [dispatch, establishments, availableEstablishments]);

  const availableEstablishmentOptions = useMemo(
    () =>
      (availableEstablishments ?? []).map((establishment) => ({
        value: establishment.id,
        label: establishment.name,
      })),
    [availableEstablishments]
  );

  const establishmentWithKinds = useMemo(
    () => (kinds: EstablishmentKind[]) =>
      (establishments ?? availableEstablishments ?? [])
        .filter((establishment) => kinds.includes(establishment.kind))
        .sort((e1, e2) => e1.shortName.localeCompare(e2.shortName)),
    [establishments, availableEstablishments]
  );

  return {
    availableEstablishments,
    availableEstablishmentOptions,
    establishmentWithKinds,
  };
};
