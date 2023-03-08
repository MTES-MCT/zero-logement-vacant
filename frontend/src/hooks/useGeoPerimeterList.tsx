import { useEffect } from 'react';
import { fetchGeoPerimeters } from '../store/actions/establishmentAction';
import { useAppDispatch, useAppSelector } from './useStore';

export const useGeoPerimeterList = (forceReload = false) => {
  const dispatch = useAppDispatch();
  const { geoPerimeters, loading } = useAppSelector(
    (state) => state.establishment
  );

  useEffect(() => {
    if (forceReload || (!geoPerimeters && !loading)) {
      dispatch(fetchGeoPerimeters());
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  return geoPerimeters;
};
