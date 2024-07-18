import {
  useFindEstablishmentsQuery,
  useFindOneEstablishmentQuery
} from '../services/establishment.service';
import { useMemo } from 'react';

export const useEstablishment = (name?: string, geoCodes?: string[]) => {
  const { data: establishment, } = useFindOneEstablishmentQuery(
    {
      geoCodes,
      name,
    },
    { skip: !name, }
  );

  const { data: localityEpciEstablishment, } = useFindOneEstablishmentQuery(
    {
      geoCodes: establishment?.geoCodes,
      kind: 'EPCI',
    },
    { skip: !establishment || establishment.kind !== 'Commune', }
  );

  const epciEstablishment = useMemo(
    () =>
      establishment?.kind === 'EPCI'
        ? establishment
        : localityEpciEstablishment,
    [establishment, localityEpciEstablishment]
  );

  const { data: nearbyEstablishments, } = useFindEstablishmentsQuery(
    {
      geoCodes: epciEstablishment?.geoCodes,
      kind: 'Commune',
    },
    { skip: !epciEstablishment, }
  );

  return {
    establishment,
    epciEstablishment,
    nearbyEstablishments: nearbyEstablishments
      ?.filter((_) =>
        establishment?.kind === 'Commune'
          ? !_.geoCodes.includes(establishment.geoCodes[0])
          : true
      )
      .sort((e1, e2) => e1.shortName.localeCompare(e2.shortName)),
  };
};
