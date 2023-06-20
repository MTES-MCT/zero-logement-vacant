import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { getHousing } from '../store/actions/housingAction';
import { useAppDispatch, useAppSelector } from './useStore';
import { useFindEventsByHousingQuery } from '../services/event.service';
import { useFindNotesByHousingQuery } from '../services/note.service';
import { useFindOwnersByHousingQuery } from '../services/owner.service';

export function useHousing() {
  const dispatch = useAppDispatch();
  const { housingId } = useParams<{ housingId: string }>();

  const { data: events, refetch: refetchHousingEvents } =
    useFindEventsByHousingQuery(housingId);

  const { data: notes, refetch: refetchHousingNotes } =
    useFindNotesByHousingQuery(housingId);

  const { data: housingOwners } = useFindOwnersByHousingQuery(housingId);

  useEffect(() => {
    dispatch(getHousing(housingId));
  }, [housingId, dispatch]);

  const { housing } = useAppSelector((state) => state.housing);

  const mainHousingOwner = housingOwners?.find((_) => _.rank === 1);
  const coOwners = housingOwners?.filter((_) => _.rank !== 1);

  return {
    events,
    notes,
    refetchHousingEvents,
    refetchHousingNotes,
    mainHousingOwner,
    coOwners,
    housingOwners,
    housing,
  };
}
