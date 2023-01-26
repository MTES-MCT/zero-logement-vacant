import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { fetchLocalities } from '../store/actions/establishmentAction';
import { Locality } from '../models/Locality';

export const useLocalityList = (forceReload = false) => {
  const dispatch = useDispatch();
  const { localities, loading } = useSelector(
    (state: ApplicationState) => state.establishment
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
