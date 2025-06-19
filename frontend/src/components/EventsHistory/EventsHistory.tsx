import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Array, Order, pipe, Predicate, Record } from 'effect';
import { ReactNode } from 'react';

import NoEvent from '../../assets/images/no-event.svg';
import { Event } from '../../models/Event';
import { Note } from '../../models/Note';
import { useFindEstablishmentsQuery } from '../../services/establishment.service';
import Image from '../Image/Image';
import AggregatedEventCard from './AggregatedEventCard';
import IndividualEventCard from './IndividualEventCard';
import NoteCard from './NoteCard';

interface Props {
  events: Event[];
  notes: Note[];
}

function EventsHistory({ events, notes }: Props) {
  const { data: establishments } = useFindEstablishmentsQuery({
    // Fetch only the establishments involved in the events or notes
    id: pipe(
      [...events, ...notes],
      Array.map((eventOrNote) => eventOrNote.creator.establishmentId),
      Array.filter(Predicate.isNotNullable),
      Array.dedupe
    )
  });

  function isEvent(event: Event | Note): event is Event {
    return 'type' in event;
  }

  const history: ReadonlyArray<ReactNode> = pipe(
    [...events, ...notes],
    Array.sortWith(
      (event) => new Date(event.createdAt),
      Order.reverse(Order.Date)
    ),
    Array.groupBy((event) => event.createdAt.substring(0, 'yyyy-mm-dd'.length)),
    Record.map((eventsOrNotes) => {
      // Notes and events of the day
      const [notes, events] = Array.partition(eventsOrNotes, isEvent);

      if (events.length >= 2) {
        // Aggregate events
        return [
          <AggregatedEventCard
            key={events.length}
            events={events as unknown as Array.NonEmptyReadonlyArray<Event>}
          />,
          ...notes.map((note) => {
            const establishment = establishments?.find(
              (establishment) =>
                establishment.id === note.creator.establishmentId
            );
            return (
              <NoteCard
                key={note.id}
                note={note}
                establishment={establishment ?? null}
              />
            );
          })
        ];
      }

      return pipe(
        [...notes, ...events],
        Array.sortWith(
          (eventOrNote) => new Date(eventOrNote.createdAt),
          Order.reverse(Order.Date)
        ),
        Array.map((eventOrNote) => {
          const establishment = establishments?.find(
            (establishment) =>
              establishment.id === eventOrNote.creator.establishmentId
          );
          return isEvent(eventOrNote) ? (
            <IndividualEventCard
              event={eventOrNote}
              establishment={establishment ?? null}
            />
          ) : (
            <NoteCard
              note={eventOrNote}
              establishment={establishment ?? null}
            />
          );
        })
      );
    }),
    Record.values,
    Array.flatten
  );

  if (history.length === 0) {
    return (
      <Stack sx={{ alignItems: 'center' }}>
        <Box sx={{ maxWidth: '7.5rem' }}>
          <Image
            alt="50 heures de travail de travail économisées en utilisant Zéro Logement Vacant"
            responsive="max-height"
            src={NoEvent}
          />
        </Box>
        <Typography variant="subtitle1">
          Pas d’évènement ou de note à afficher
        </Typography>
      </Stack>
    );
  }

  return <Stack spacing="1.5rem">{history}</Stack>;
}

export default EventsHistory;
