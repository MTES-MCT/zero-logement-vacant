import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { fetchGeoPerimeters } from '../store/actions/establishmentAction';

export const useGeoPerimeterList = (forceReload = false) => {
  const dispatch = useDispatch();
  const { geoPerimeters, loading } = useSelector(
    (state: ApplicationState) => state.establishment
  );

  useEffect(() => {
    if (forceReload || (!geoPerimeters && !loading)) {
      dispatch(fetchGeoPerimeters());
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  return geoPerimeters;
};
