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

  const establishmentShortNamesByKinds = useMemo(
    () => (kinds: EstablishmentKind[]) =>
      (establishments ?? availableEstablishments ?? [])
        .filter((establishment) => kinds.includes(establishment.kind))
        .map((establishment) =>
          kinds.includes('Commune')
            ? establishment.name.replaceAll(/^Commune d(e\s|')/g, '')
            : establishment.name
        )
        .map((shortName) =>
          shortName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
        .sort(),
    [establishments, availableEstablishments]
  );

  return {
    availableEstablishments,
    availableEstablishmentOptions,
    establishmentShortNamesByKinds,
  };
};
