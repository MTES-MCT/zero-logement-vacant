import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import {
  getOwner,
  getOwnerEvents,
  getOwnerHousing,
} from '../store/actions/ownerAction';
import { useAppDispatch, useAppSelector } from './useStore';

export function useOwner() {
  const dispatch = useAppDispatch();
  const { ownerId } = useParams<{ ownerId: string }>();

  useEffect(() => {
    dispatch(getOwner(ownerId));
    dispatch(getOwnerHousing(ownerId));
    dispatch(getOwnerEvents(ownerId));
  }, [ownerId, dispatch]);

  const { events, housingList, housingTotalCount, owner } = useAppSelector(
    (state) => state.owner
  );

  return {
    events,
    housingList,
    housingTotalCount,
    owner,
  };
}
