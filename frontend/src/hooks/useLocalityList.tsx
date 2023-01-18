import { useEffect } from 'react';
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

  const localityOptions = (localities ?? []).map((l) => ({
    value: l.geoCode,
    label: l.name,
  }));

  const hasTLV = (locality: Locality) =>
    locality.taxZone !== undefined &&
    locality.taxZone !== '' &&
    locality.taxZone !== 'C';

  const hasTHLV = (locality: Locality) => locality.taxRate !== null;
  const hasNoTax = (locality: Locality) =>
    !hasTLV(locality) && !hasTHLV(locality);

  const filterCount = (filter: (locality: Locality) => boolean) =>
    localities?.filter(filter).length;

  return {
    localities,
    localityOptions,
    hasTLV,
    hasTHLV,
    hasNoTax,
    filterCount,
  };
};
