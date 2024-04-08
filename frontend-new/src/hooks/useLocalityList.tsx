import { useMemo } from 'react';
import { Locality } from '../models/Locality';
import { useListLocalitiesQuery } from '../services/locality.service';

export const useLocalityList = (establishmentId?: string) => {
  const { data: localities } = useListLocalitiesQuery(establishmentId!, {
    skip: !establishmentId,
  });

  const localitiesOptions = useMemo(
    () =>
      (localities ?? []).map((l) => ({
        value: l.geoCode,
        label: l.name,
      })),
    [localities]
  );

  const localitiesGeoCodes = useMemo(
    () => (localities ?? []).map((_) => _.geoCode),
    [localities]
  );

  const filterCount = (filter: (locality: Locality) => boolean) =>
    localities?.filter(filter).length;

  return {
    localities,
    localitiesOptions,
    localitiesGeoCodes,
    filterCount,
  };
};
