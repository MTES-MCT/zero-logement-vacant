import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { fetchAvailableEstablishments } from '../store/actions/authenticationAction';
import { EstablishmentKind } from '../../../shared/types/EstablishmentKind';
import { Establishment } from '../models/Establishment';

export const useEstablishments = (establishments?: Establishment[]) => {
  const dispatch = useDispatch();
  const { availableEstablishments } = useSelector(
    (state: ApplicationState) => state.authentication
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
