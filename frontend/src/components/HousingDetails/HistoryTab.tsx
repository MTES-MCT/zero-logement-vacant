import Skeleton from '@mui/material/Skeleton';
import { skipToken } from '@reduxjs/toolkit/query';

import EventsHistory from '~/components/EventsHistory/EventsHistory';
import { useHousing } from '~/hooks/useHousing';
import { useFindEventsByHousingQuery } from '~/services/event.service';
import { useFindNotesByHousingQuery } from '~/services/note.service';

function HistoryTab() {
  const { housing } = useHousing();
  const { data: events, isLoading: isLoadingEvents } =
    useFindEventsByHousingQuery(housing?.id ?? skipToken);
  const { data: notes, isLoading: isLoadingNotes } = useFindNotesByHousingQuery(
    housing?.id ?? skipToken
  );

  if (isLoadingEvents || isLoadingNotes) {
    return <Skeleton animation="wave" variant="rectangular" height={200} />;
  }

  return <EventsHistory events={events ?? []} notes={notes ?? []} />;
}

export default HistoryTab;
