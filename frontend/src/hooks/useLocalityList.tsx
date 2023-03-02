import { useEffect, useMemo, useState } from 'react';
import { fetchLocalities } from '../store/actions/establishmentAction';
import { Locality } from '../models/Locality';
import { useAppDispatch, useAppSelector } from './useStore';

export const useLocalityList = (
  establishmentId?: string,
  forceReload = false
) => {
  const dispatch = useAppDispatch();
  const { localities, loading } = useAppSelector(
    (state) => state.establishment
  );
  const [localitiesEstablishmentId, setLocalitiesEstablishmentId] = useState<
    string | undefined
  >(establishmentId);

  useEffect(() => {
    if (
      establishmentId &&
      !loading &&
      (forceReload ||
        !localities ||
        localitiesEstablishmentId !== establishmentId)
    ) {
      setLocalitiesEstablishmentId(establishmentId);
      dispatch(fetchLocalities(establishmentId));
    }
  }, [dispatch, establishmentId, forceReload]); //eslint-disable-line react-hooks/exhaustive-deps

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
