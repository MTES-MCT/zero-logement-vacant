import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { isSameDay } from 'date-fns';
import { Array, Order, pipe, Predicate, Record } from 'effect';

import { useState } from 'react';
import type { ReactNode } from 'react';

import NoEvent from '../../assets/images/no-event.svg';
import type { Event } from '../../models/Event';
import type { Note } from '../../models/Note';
import { formatAuthor, USER_EQUIVALENCE } from '../../models/User';
import type { User } from '../../models/User';
import { useFindEstablishmentsQuery } from '../../services/establishment.service';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import { useHousingEdition } from '../HousingEdition/useHousingEdition';
import Image from '../Image/Image';
import AggregatedEventCard from './AggregatedEventCard';
import IndividualEventCard from './IndividualEventCard';
import NoteCard from './NoteCard';

interface Props {
  events: Event[];
  notes: Note[];
}

const EVENT_TYPE_VALUES = [
  {
    value: 'note',
    label: 'Note'
  },
  {
    value: 'event',
    label: 'Mise à jour'
  }
] as const;
type EventType = (typeof EVENT_TYPE_VALUES)[number];

interface EventFilters {
  types: EventType[];
  creators: User[];
  createdAt: Date | null;
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
  const { setEditing, setTab } = useHousingEdition();

  const [filters, setFilters] = useState<EventFilters>({
    types: [],
    creators: [],
    createdAt: null
  });

  const creators = pipe(
    [...events, ...notes],
    Array.map((eventOrNote) => eventOrNote.creator),
    Array.dedupeWith(USER_EQUIVALENCE)
  );

  const history: ReadonlyArray<ReactNode> = pipe(
    [...events, ...notes],
    Array.filter(byTypes(filters.types)),
    Array.filter(byCreators(filters.creators)),
    Array.filter(byDate(filters.createdAt)),
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
            key={[...events]
              .map((event) => event.id)
              .sort((a, b) => a.localeCompare(b))
              .join('-')}
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
              key={eventOrNote.id}
              event={eventOrNote}
              establishment={establishment ?? null}
            />
          ) : (
            <NoteCard
              key={eventOrNote.id}
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

  return (
    <Stack spacing="1.5rem">
      <Grid component="header" container columnSpacing="1rem">
        <Grid component="section" sx={{ pl: 0 }} size={4}>
          <AppSelectNext
            label="Type d’événement"
            disabled={events.length === 0 && notes.length === 0}
            multiple
            options={EVENT_TYPE_VALUES}
            getOptionKey={(option) => option.value}
            getOptionLabel={(option) => option.label}
            getOptionValue={(option) => option.value}
            value={filters.types}
            onChange={(options) => {
              setFilters({
                ...filters,
                types: options
              });
            }}
          />
        </Grid>
        <Grid component="section" size={4}>
          <AppSelectNext
            label="Auteur"
            disabled={events.length === 0 && notes.length === 0}
            multiple
            options={creators}
            getOptionKey={(option) => option.id}
            getOptionLabel={(option) => {
              const establishment = establishments?.find(
                (establishment) => establishment.id === option.establishmentId
              );
              return formatAuthor(option, establishment ?? null);
            }}
            getOptionValue={(option) => option.id}
            value={filters.creators}
            onChange={(options) => {
              setFilters({
                ...filters,
                creators: options
              });
            }}
          />
        </Grid>
        <Grid component="section" sx={{ pr: 0 }} size={4}>
          <Input
            label="Date de création"
            disabled={events.length === 0 && notes.length === 0}
            nativeInputProps={{
              type: 'date',
              value:
                filters.createdAt
                  ?.toJSON()
                  ?.substring(0, 'yyyy-mm-dd'.length) ?? '',
              onChange: (event) => {
                const value = event.target.value;
                setFilters({
                  ...filters,
                  createdAt: value.length > 0 ? new Date(value) : null
                });
              }
            }}
          />
        </Grid>
      </Grid>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Button
          priority="secondary"
          iconId="fr-icon-add-line"
          iconPosition="left"
          onClick={() => {
            setTab('note');
            setEditing(true);
          }}
        >
          Ajouter une note
        </Button>
        <Button
          priority="tertiary"
          iconId="ri-loop-left-line"
          iconPosition="left"
          onClick={() => {
            setFilters({
              types: [],
              creators: [],
              createdAt: null
            });
          }}
        >
          Réinitialiser les filtres
        </Button>
      </Stack>
      {history.length === 0 ? (
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
      ) : (
        <Stack spacing="1.5rem">{history}</Stack>
      )}
    </Stack>
  );
}

function isEvent(event: Event | Note): event is Event {
  return 'type' in event;
}

function isNote(event: Event | Note): event is Note {
  return 'content' in event;
}

function byTypes(types: ReadonlyArray<EventType>) {
  return (event: Event | Note): boolean => {
    if (types.length === 0) {
      return true; // No filter, include all events/notes
    }

    if (types.map((type) => type.value).includes('event') && isEvent(event)) {
      return true;
    }

    if (types.map((type) => type.value).includes('note') && isNote(event)) {
      return true;
    }

    return false;
  };
}

function byCreators(creators: ReadonlyArray<User>) {
  return (event: Event | Note): boolean => {
    if (creators.length === 0) {
      return true; // No filter, include all events/notes
    }

    return creators.some((creator) => USER_EQUIVALENCE(event.creator, creator));
  };
}

function byDate(date: Date | null) {
  return (event: Event | Note): boolean => {
    if (!date) {
      return true; // No filter, include all events/notes
    }

    return isSameDay(date, new Date(event.createdAt));
  };
}

export default EventsHistory;
