import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { useEffect } from 'react';
import {
  getHousing,
  getHousingEvents,
  getHousingOwners,
} from '../store/actions/housingAction';

export function useHousing() {
  const dispatch = useDispatch();
  const { housingId } = useParams<{ housingId: string }>();

  useEffect(() => {
    dispatch(getHousing(housingId));
    dispatch(getHousingOwners(housingId));
    dispatch(getHousingEvents(housingId));
  }, [housingId, dispatch]);

  const { housing, housingOwners, events } = useSelector(
    (state: ApplicationState) => state.housing
  );

  const mainHousingOwner = housingOwners?.filter((_) => _.rank === 1)[0];

  return {
    events,
    mainHousingOwner,
    housingOwners,
    housing,
  };
}
