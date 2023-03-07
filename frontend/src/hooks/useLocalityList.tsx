import { useEffect, useMemo } from 'react';
import { fetchLocalities } from '../store/actions/establishmentAction';
import { Locality } from '../models/Locality';
import { useAppDispatch, useAppSelector } from './useStore';

export const useLocalityList = (forceReload = false) => {
  const dispatch = useAppDispatch();
  const { localities, loading } = useAppSelector(
    (state) => state.establishment
  );

  useEffect(() => {
    if (forceReload || (!localities && !loading)) {
      dispatch(fetchLocalities());
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

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
