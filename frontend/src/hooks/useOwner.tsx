import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { getOwner, getOwnerHousing } from '../store/actions/ownerAction';
import { useAppDispatch, useAppSelector } from './useStore';
import { useFindEventsByOwnerQuery } from '../services/event.service';

export function useOwner() {
  const dispatch = useAppDispatch();
  const { ownerId } = useParams<{ ownerId: string }>();

  const { data: events, refetch: refetchOwnerEvents } =
    useFindEventsByOwnerQuery(ownerId);

  useEffect(() => {
    dispatch(getOwner(ownerId));
    dispatch(getOwnerHousing(ownerId));
  }, [ownerId, dispatch]);

  const { housingList, housingTotalCount, owner } = useAppSelector(
    (state) => state.owner
  );

  return {
    events,
    refetchOwnerEvents,
    housingList,
    housingTotalCount,
    owner,
  };
}
