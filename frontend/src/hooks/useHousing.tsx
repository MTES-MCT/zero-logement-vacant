import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { getHousing, getHousingOwners } from '../store/actions/housingAction';
import { useAppDispatch, useAppSelector } from './useStore';
import { useFindEventsByHousingQuery } from '../services/event.service';
import { useFindNotesByHousingQuery } from '../services/note.service';

export function useHousing() {
  const dispatch = useAppDispatch();
  const { housingId } = useParams<{ housingId: string }>();

  const { data: events, refetch: refetchHousingEvents } =
    useFindEventsByHousingQuery(housingId);

  const { data: notes, refetch: refetchHousingNotes } =
    useFindNotesByHousingQuery(housingId);

  useEffect(() => {
    dispatch(getHousing(housingId));
    dispatch(getHousingOwners(housingId));
  }, [housingId, dispatch]);

  const { housing, housingOwners } = useAppSelector((state) => state.housing);

  const mainHousingOwner = housingOwners?.filter((_) => _.rank === 1)[0];

  return {
    events,
    notes,
    refetchHousingEvents,
    refetchHousingNotes,
    mainHousingOwner,
    housingOwners,
    housing,
  };
}
