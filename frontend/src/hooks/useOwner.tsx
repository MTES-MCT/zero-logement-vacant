import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { getOwnerHousing } from '../store/actions/ownerAction';
import { useAppDispatch, useAppSelector } from './useStore';
import { useFindEventsByOwnerQuery } from '../services/event.service';
import { useGetOwnerQuery } from '../services/owner.service';

export function useOwner() {
  const dispatch = useAppDispatch();
  const { ownerId } = useParams<{ ownerId: string }>();

  const { data: events, refetch: refetchOwnerEvents } =
    useFindEventsByOwnerQuery(ownerId);

  const { data: owner } = useGetOwnerQuery(ownerId);

  useEffect(() => {
    dispatch(getOwnerHousing(ownerId));
  }, [ownerId, dispatch]);

  const { housingList, housingTotalCount } = useAppSelector(
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
