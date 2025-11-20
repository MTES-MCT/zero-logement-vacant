import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo } from 'react';

import type { Establishment } from '~/models/Establishment';
import { useListLocalitiesQuery } from '~/services/locality.service';

export function useLocalityList(establishmentId: Establishment['id'] | null) {
  const listLocalitiesQuery = useListLocalitiesQuery(
    establishmentId ?? skipToken
  );
  const localities = listLocalitiesQuery.data;

  const localitiesOptions = useMemo(
    () =>
      (localities ?? []).map((l) => ({
        value: l.geoCode,
        label: l.name,
        badgeLabel: `Commune : ${l.name}`
      })),
    [localities]
  );

  return {
    localities,
    localitiesOptions,
    listLocalitiesQuery
  };
}
