import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { useEffect } from 'react';
import {
  getOwner,
  getOwnerEvents,
  getOwnerHousing,
} from '../store/actions/ownerAction';

export function useOwner() {
  const dispatch = useDispatch();
  const { ownerId } = useParams<{ ownerId: string }>();

  useEffect(() => {
    dispatch(getOwner(ownerId));
    dispatch(getOwnerHousing(ownerId));
    dispatch(getOwnerEvents(ownerId));
  }, [ownerId, dispatch]);

  const { events, housingList, housingTotalCount, owner } = useSelector(
    (state: ApplicationState) => state.owner
  );

  return {
    events,
    housingList,
    housingTotalCount,
    owner,
  };
}
