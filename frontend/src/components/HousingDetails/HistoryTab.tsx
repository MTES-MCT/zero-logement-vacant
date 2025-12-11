import Skeleton from '@mui/material/Skeleton';

import { useHousing } from '../../hooks/useHousing';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { useFindNotesByHousingQuery } from '../../services/note.service';
import EventsHistory from '../EventsHistory/EventsHistory';

function HistoryTab() {
  const { housingId } = useHousing();
  const { data: events, isLoading: isLoadingEvents } =
    useFindEventsByHousingQuery(housingId);
  const { data: notes, isLoading: isLoadingNotes } =
    useFindNotesByHousingQuery(housingId);

  if (isLoadingEvents || isLoadingNotes) {
    return <Skeleton animation="wave" variant="rectangular" height={200} />;
  }

  return <EventsHistory events={events ?? []} notes={notes ?? []} />;
}

export default HistoryTab;
