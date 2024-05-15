import { useMemo } from 'react';
import { EstablishmentKind } from '@zerologementvacant/models';
import { useFindEstablishmentsQuery } from '../services/establishment.service';

export const useAvailableEstablishments = () => {
  const { data: availableEstablishments } = useFindEstablishmentsQuery({
    available: true,
  });

  const availableEstablishmentOptions = useMemo(
    () =>
      (availableEstablishments ?? []).map((establishment) => ({
        value: establishment.id,
        label: establishment.name,
      })),
    [availableEstablishments],
  );

  const availableEstablishmentWithKinds = useMemo(
    () => (kinds: EstablishmentKind[]) =>
      (availableEstablishments ?? [])
        .filter((establishment) => kinds.includes(establishment.kind))
        .sort((e1, e2) => e1.shortName.localeCompare(e2.shortName)),
    [availableEstablishments],
  );

  return {
    availableEstablishments,
    availableEstablishmentOptions,
    availableEstablishmentWithKinds,
  };
};
