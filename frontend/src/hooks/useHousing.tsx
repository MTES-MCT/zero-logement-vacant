import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import {
  getHousing,
  getHousingEvents,
  getHousingOwners,
} from '../store/actions/housingAction';
import { useAppDispatch, useAppSelector } from './useStore';

export function useHousing() {
  const dispatch = useAppDispatch();
  const { housingId } = useParams<{ housingId: string }>();

  useEffect(() => {
    dispatch(getHousing(housingId));
    dispatch(getHousingOwners(housingId));
    dispatch(getHousingEvents(housingId));
  }, [housingId, dispatch]);

  const { housing, housingOwners, events } = useAppSelector(
    (state) => state.housing
  );

  const mainHousingOwner = housingOwners?.filter((_) => _.rank === 1)[0];

  return {
    events,
    mainHousingOwner,
    housingOwners,
    housing,
  };
}
