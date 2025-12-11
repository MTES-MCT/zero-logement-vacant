import Skeleton from '@mui/material/Skeleton';

import { type Housing } from '../../models/Housing';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { useFindNotesByHousingQuery } from '../../services/note.service';
import EventsHistory from '../EventsHistory/EventsHistory';

interface HistoryTabProps {
  housing: Housing;
}

function HistoryTab(props: Readonly<HistoryTabProps>) {
  const { data: events, isLoading: isLoadingEvents } =
    useFindEventsByHousingQuery(props.housing.id);
  const { data: notes, isLoading: isLoadingNotes } = useFindNotesByHousingQuery(
    props.housing.id
  );

  if (isLoadingEvents || isLoadingNotes) {
    return <Skeleton animation="wave" variant="rectangular" height={200} />;
  }

  return <EventsHistory events={events ?? []} notes={notes ?? []} />;
}

export default HistoryTab;
