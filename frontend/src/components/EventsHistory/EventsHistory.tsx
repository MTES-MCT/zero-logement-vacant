import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { differenceInMilliseconds } from 'date-fns';
import { ReactNode, useState } from 'react';
import { match, Pattern } from 'ts-pattern';
import NoEvent from '../../assets/images/no-event.svg';
import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';

import { Event } from '../../models/Event';
import { Note } from '../../models/Note';
import { HousingOwner } from '../../models/Owner';
import Image from '../Image/Image';
import { CampaignCreatedEventContent } from './CampaignEventContent';
import EventCard from './EventCard';
import {
  GroupArchivedEventContent,
  GroupHousingAddedEventContent,
  GroupHousingRemovedEventContent,
  GroupRemovedEventContent
} from './GroupEventContent';
import {
  HousingCreatedEventContent,
  HousingOccupancyChangeEventContent,
  HousingStatusChangeEventContent
} from './HousingEventContent';
import NoteCard from './NoteCard';
import NoteEventContent from './NoteEventContent';
import {
  OwnerChangeEventContent,
  OwnerCreatedEventContent,
  OwnersChangeEventContent,
  PrimaryOwnerChangeEventContent
} from './OwnershipEventContent';

interface Props {
  events: Event[];
  notes: Note[];
}

function EventsHistory({ events, notes }: Props) {
  const [expandEvents, setExpandEvents] = useState(false);

  const eventAndNotes = [...events, ...notes].toSorted((e1, e2) =>
    differenceInMilliseconds(e2.createdAt, e1.createdAt)
  );

  const { availableEstablishments } = useAvailableEstablishments();

  function isEvent(e: Event | Note): e is Event {
    return (e as Event).category !== undefined;
  }

  function renderEventContent(eventOrNote: Event | Note): ReactNode {
    if (!isEvent(eventOrNote)) {
      return <NoteEventContent note={eventOrNote} />;
    }

    const event = eventOrNote;

    return (
      match(event)
        // Housing events
        .with({ name: 'Création du logement' }, () => (
          <HousingCreatedEventContent event={event} />
        ))
        .with(
          {
            name: Pattern.union(
              "Modification du statut d'occupation",
              'Changement de statut d’occupation'
            )
          },
          (event) => <HousingOccupancyChangeEventContent event={event} />
        )
        .with({ name: 'Changement de statut de suivi' }, (event) => (
          <HousingStatusChangeEventContent event={event} />
        ))
        // Owner events
        .with({ name: "Création d'un nouveau propriétaire" }, (event) => (
          <OwnerCreatedEventContent event={event} />
        ))
        .with({ name: 'Modification de coordonnées' }, (event) => (
          <OwnerChangeEventContent event={event} />
        ))
        .with({ name: "Modification d'identité" }, (event) => (
          <OwnerChangeEventContent event={event} />
        ))
        .with({ name: 'Changement de propriétaire principal' }, (event) => (
          <PrimaryOwnerChangeEventContent event={event} />
        ))
        .with(
          { name: 'Changement de propriétaires' },
          (event: Event<HousingOwner[]>) => (
            <OwnersChangeEventContent
              conflict={event.conflict ?? false}
              housingOwnersBefore={event.old ?? []}
              housingOwnersAfter={event.new ?? []}
            />
          )
        )
        // Campaign events
        .with({ name: 'Ajout dans une campagne' }, (event) => (
          <CampaignCreatedEventContent event={event} />
        ))
        // Group events
        .with({ name: 'Ajout dans un groupe' }, (event) => (
          <GroupHousingAddedEventContent event={event} />
        ))
        .with({ name: 'Retrait d’un groupe' }, (event) => (
          <GroupHousingRemovedEventContent event={event} />
        ))
        .with({ name: 'Archivage d’un groupe' }, (event) => (
          <GroupArchivedEventContent event={event} />
        ))
        .with({ name: 'Suppression d’un groupe' }, (event) => (
          <GroupRemovedEventContent event={event} />
        ))
        .otherwise(() => null)
    );
  }

  if (eventAndNotes.length === 0) {
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

  return (
    <Stack spacing="1.5rem">
      {eventAndNotes
        .filter((_, index) => expandEvents || index < 3)
        .map((eventOrNote) => {
          const establishment = availableEstablishments?.find(
            (establishment) =>
              establishment.id === eventOrNote.creator.establishmentId
          );

          return isEvent(eventOrNote) ? (
            <EventCard
              key={eventOrNote.id}
              title={isEvent(eventOrNote) ? eventOrNote.name : 'Note'}
              description={renderEventContent(eventOrNote)}
              createdAt={eventOrNote.createdAt}
              createdBy={eventOrNote.creator}
            />
          ) : (
            <NoteCard
              key={eventOrNote.id}
              content={eventOrNote.content}
              createdAt={eventOrNote.createdAt}
              createdBy={eventOrNote.creator}
              establishment={establishment ?? null}
            />
          );
        })}
      {!expandEvents && eventAndNotes.length > 3 && (
        <button
          className="ds-fr--inline fr-link"
          type="button"
          title="Voir tout le suivi"
          onClick={() => setExpandEvents(!expandEvents)}
        >
          Voir tout le suivi
          <span className="fr-icon-1x icon-right fr-icon-arrow-right-line ds-fr--v-middle" />
        </button>
      )}
    </Stack>
  );
}

export default EventsHistory;
